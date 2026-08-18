"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { shuffleArray } from "@/lib/utils";
import { nextPostitPlayer } from "@/lib/postit-rotation";
import { GAME_RULES } from "@/types";
import type { ActionResult } from "@/lib/action-result";
import type { Player } from "@/types";

async function assertIsHost(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  gameId: string,
  playerId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("games")
    .select("host_player_id")
    .eq("id", gameId)
    .maybeSingle();
  return data?.host_player_id === playerId;
}

function mapPlayer(row: any): Player {
  return {
    id: row.id,
    gameId: row.game_id,
    nickname: row.nickname,
    team: row.team,
    isHost: row.is_host,
    isReady: row.is_ready,
    score: row.score,
    joinedAt: row.joined_at,
    isConnected: row.is_connected,
    hintUsed: row.hint_used,
    postitWord: row.postit_word,
    postitFound: row.postit_found,
  };
}

interface StartPostitGameResult {
  roundId: string;
  firstPlayerId: string;
}

/**
 * Démarre une partie en mode Post-it : attribue à chaque joueur un mot
 * différent, pioché au hasard dans la liste de mots de la partie. Il en
 * faut donc au moins autant que de joueurs.
 */
export async function startPostitGame(
  gameId: string,
  hostPlayerId: string
): Promise<ActionResult<StartPostitGameResult>> {
  const supabase = getSupabaseServerClient();
  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut démarrer la partie." };
  }

  const { data: playerRows } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .order("joined_at");
  const players = (playerRows ?? []).map(mapPlayer);

  if (players.length < GAME_RULES.MIN_PLAYERS) {
    return { success: false, error: "Il faut au moins 2 joueurs." };
  }

  const { data: wordRows } = await supabase
    .from("words")
    .select("content")
    .eq("game_id", gameId)
    .eq("is_active", true);
  const words = (wordRows ?? []).map((w) => w.content as string);

  if (words.length < players.length) {
    return {
      success: false,
      error: `Il faut au moins ${players.length} mots dans la liste pour ${players.length} joueurs (actuellement ${words.length}).`,
    };
  }

  const assignedWords = shuffleArray(words).slice(0, players.length);
  const updates = players.map((player, index) =>
    supabase
      .from("players")
      .update({ postit_word: assignedWords[index], postit_found: false })
      .eq("id", player.id)
  );
  const results = await Promise.all(updates);
  if (results.some((r) => r.error)) {
    return { success: false, error: "Impossible d'attribuer les mots." };
  }

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      game_id: gameId,
      round_number: 1,
      status: "in_progress",
      blue_team_score: 0,
      yellow_team_score: 0,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (roundError || !round) {
    return { success: false, error: "Impossible de créer la manche." };
  }

  const first = players[0];
  if (!first) {
    return { success: false, error: "Impossible de déterminer le premier joueur." };
  }

  const { error: gameError } = await supabase
    .from("games")
    .update({
      status: "in_progress",
      current_round: 1,
      current_player_id: first.id,
      current_team: null,
    })
    .eq("id", gameId);

  if (gameError) {
    return { success: false, error: "Impossible de démarrer la partie." };
  }

  return { success: true, data: { roundId: round.id, firstPlayerId: first.id } };
}

interface AdvancePostitResult {
  gameFinished: boolean;
  nextPlayerId: string | null;
}

/**
 * Un autre joueur (jamais celui dont c'est le tour) valide depuis son
 * propre écran que le mot a été deviné. Passe ensuite au joueur suivant
 * qui n'a pas encore trouvé le sien, ou termine la partie si c'était le
 * dernier.
 */
export async function validatePostitGuess(
  gameId: string,
  currentPlayerId: string,
  validatorPlayerId: string
): Promise<ActionResult<AdvancePostitResult>> {
  const supabase = getSupabaseServerClient();

  if (currentPlayerId === validatorPlayerId) {
    return { success: false, error: "Tu ne peux pas valider ta propre trouvaille." };
  }

  const { data: game } = await supabase
    .from("games")
    .select("current_player_id")
    .eq("id", gameId)
    .maybeSingle();
  if (game?.current_player_id !== currentPlayerId) {
    return { success: false, error: "Ce n'est plus le tour de ce joueur." };
  }

  const { error: updateError } = await supabase
    .from("players")
    .update({ postit_found: true })
    .eq("id", currentPlayerId);
  if (updateError) {
    return { success: false, error: "Impossible d'enregistrer la trouvaille." };
  }

  return advanceToNextPostitPlayer(supabase, gameId, currentPlayerId);
}

/**
 * Le temps (1 minute) s'est écoulé sans que personne n'ait validé : le
 * joueur garde son mot pour un prochain tour, on passe simplement au
 * suivant.
 */
export async function expirePostitTurn(
  gameId: string,
  currentPlayerId: string
): Promise<ActionResult<AdvancePostitResult>> {
  const supabase = getSupabaseServerClient();

  const { data: game } = await supabase
    .from("games")
    .select("current_player_id")
    .eq("id", gameId)
    .maybeSingle();
  if (game?.current_player_id !== currentPlayerId) {
    // Le tour a déjà changé entre-temps (ex: validé juste avant l'expiration
    // du chrono côté serveur) : rien à faire, pas une vraie erreur.
    return { success: true, data: { gameFinished: false, nextPlayerId: null } };
  }

  return advanceToNextPostitPlayer(supabase, gameId, currentPlayerId);
}

async function advanceToNextPostitPlayer(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  gameId: string,
  currentPlayerId: string
): Promise<ActionResult<AdvancePostitResult>> {
  const { data: playerRows } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .order("joined_at");
  const players = (playerRows ?? []).map(mapPlayer);

  const next = nextPostitPlayer(players, currentPlayerId);

  if (!next) {
    await supabase
      .from("rounds")
      .update({ status: "finished", ended_at: new Date().toISOString() })
      .eq("game_id", gameId)
      .eq("round_number", 1);
    await supabase
      .from("games")
      .update({ status: "finished", current_player_id: null })
      .eq("id", gameId);

    return { success: true, data: { gameFinished: true, nextPlayerId: null } };
  }

  await supabase.from("games").update({ current_player_id: next.id }).eq("id", gameId);

  return { success: true, data: { gameFinished: false, nextPlayerId: next.id } };
}
