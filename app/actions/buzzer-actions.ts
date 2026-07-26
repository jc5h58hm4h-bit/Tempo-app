"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { shuffleArray } from "@/lib/utils";
import { nextUnplayedPlayerInOrder } from "@/lib/turn-order";
import { BUZZER_WORDS_PER_TURN, GAME_RULES } from "@/types";
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
  };
}

/**
 * À la fin d'une partie Buzzer, cumule le score total de chaque joueur
 * (points gagnés comme "je fais deviner" + points gagnés comme "je devine")
 * dans player_stats, par pseudo, année et mode. Contrairement aux modes
 * classique/chrono, aucune correction d'attribution n'est nécessaire ici :
 * le score du joueur reflète déjà directement ses deux rôles.
 */
async function recordBuzzerAnnualStats(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  gameId: string
): Promise<void> {
  const { data: playerRows } = await supabase
    .from("players")
    .select("nickname, score")
    .eq("game_id", gameId);
  const players = playerRows ?? [];
  if (players.length === 0) return;

  const year = new Date().getFullYear();

  await Promise.all(
    players.map(async (player) => {
      const { data: existing } = await supabase
        .from("player_stats")
        .select("id, words_guessed, games_played")
        .eq("nickname", player.nickname)
        .eq("year", year)
        .eq("mode", "buzzer")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("player_stats")
          .update({
            words_guessed: existing.words_guessed + player.score,
            games_played: existing.games_played + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("player_stats").insert({
          nickname: player.nickname,
          year,
          mode: "buzzer",
          words_guessed: player.score,
          games_played: 1,
        });
      }
    })
  );
}

interface StartBuzzerGameResult {
  roundId: string;
  describerId: string;
}

/**
 * Démarre une partie en mode Buzzer : pas d'équipes, le premier joueur
 * (par ordre d'arrivée) devient le premier à faire deviner.
 */
export async function startBuzzerGame(
  gameId: string,
  hostPlayerId: string
): Promise<ActionResult<StartBuzzerGameResult>> {
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

  const first = players[0];
  if (!first) {
    return { success: false, error: "Impossible de déterminer le premier joueur." };
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

  const { error: gameError } = await supabase
    .from("games")
    .update({
      status: "in_progress",
      current_round: 1,
      current_player_id: first.id,
      current_team: null,
      buzzer_current_word_id: null,
      buzzer_player_id: null,
    })
    .eq("id", gameId);

  if (gameError) {
    return { success: false, error: "Impossible de démarrer la partie." };
  }

  return { success: true, data: { roundId: round.id, describerId: first.id } };
}

interface StartBuzzerTurnResult {
  turnId: string;
  wordQueue: { id: string; content: string }[];
}

/** Démarre le tour d'un joueur qui fait deviner : sélectionne jusqu'à 15 mots. */
export async function startBuzzerTurn(
  gameId: string,
  roundId: string,
  describerId: string
): Promise<ActionResult<StartBuzzerTurnResult>> {
  const supabase = getSupabaseServerClient();

  const { data: words } = await supabase
    .from("words")
    .select("id, content")
    .eq("game_id", gameId)
    .eq("is_active", true);

  const batch = shuffleArray(words ?? []).slice(0, BUZZER_WORDS_PER_TURN);
  if (batch.length === 0) {
    return { success: false, error: "Plus aucun mot disponible pour ce tour." };
  }

  const { data: turn, error: turnError } = await supabase
    .from("turns")
    .insert({
      game_id: gameId,
      round_id: roundId,
      player_id: describerId,
      team: null,
      score: 0,
      started_at: new Date().toISOString(),
      word_queue: batch,
      queue_position: 0,
    })
    .select("id")
    .single();

  if (turnError || !turn) {
    return { success: false, error: "Impossible de démarrer le tour." };
  }

  await supabase
    .from("games")
    .update({
      current_player_id: describerId,
      buzzer_current_word_id: batch[0]?.id ?? null,
      buzzer_player_id: null,
    })
    .eq("id", gameId);

  return { success: true, data: { turnId: turn.id, wordQueue: batch } };
}

/**
 * Un joueur (jamais celui qui fait deviner) appuie sur le buzzer. Premier
 * arrivé, premier servi : la mise à jour n'a d'effet que si personne n'a
 * encore buzzé pour ce mot (condition atomique côté base de données, donc
 * fiable même si deux joueurs appuient au même moment).
 */
export async function pressBuzzer(
  gameId: string,
  playerId: string
): Promise<ActionResult<{ buzzed: boolean }>> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("games")
    .update({ buzzer_player_id: playerId })
    .eq("id", gameId)
    .is("buzzer_player_id", null)
    .select("id");

  if (error) {
    return { success: false, error: "Impossible d'enregistrer le buzz." };
  }

  return { success: true, data: { buzzed: (data?.length ?? 0) > 0 } };
}

interface ResolveBuzzResult {
  turnFinished: boolean;
  gameFinished: boolean;
}

/**
 * Celui qui fait deviner valide la réponse dite à voix haute par le joueur
 * qui a buzzé (c'est lui qui l'a entendue, l'appli ne peut pas le savoir).
 * Juste : lui et celui qui faisait deviner gagnent chacun 1 point.
 * Faux : celui qui a buzzé perd 1 point, le mot est perdu, on passe
 * directement au suivant.
 * Dans les deux cas, le mot est retiré de la pile pour le reste de la partie.
 *
 * Ne prend pas turnId en paramètre : on retrouve le tour actif directement
 * à partir de la manche et de qui fait deviner.
 */
export async function resolveBuzz(
  gameId: string,
  roundId: string,
  describerId: string,
  buzzerId: string,
  correct: boolean
): Promise<ActionResult<ResolveBuzzResult>> {
  const supabase = getSupabaseServerClient();

  const { data: turn } = await supabase
    .from("turns")
    .select("id, word_queue, queue_position")
    .eq("round_id", roundId)
    .eq("player_id", describerId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!turn) {
    return { success: false, error: "Tour introuvable." };
  }
  const turnId = turn.id;

  const wordQueue = (turn.word_queue ?? []) as { id: string; content: string }[];
  const currentWord = wordQueue[turn.queue_position];
  if (!currentWord) {
    return { success: false, error: "Aucun mot en cours." };
  }

  await supabase.from("words").update({ is_active: false }).eq("id", currentWord.id);

  if (correct) {
    await supabase.from("guessed_words").insert({
      game_id: gameId,
      round_id: roundId,
      turn_id: turnId,
      word_id: currentWord.id,
      player_id: buzzerId,
    });

    const [{ data: buzzer }, { data: describer }] = await Promise.all([
      supabase.from("players").select("score").eq("id", buzzerId).maybeSingle(),
      supabase.from("players").select("score").eq("id", describerId).maybeSingle(),
    ]);
    await Promise.all([
      supabase
        .from("players")
        .update({ score: (buzzer?.score ?? 0) + 1 })
        .eq("id", buzzerId),
      supabase
        .from("players")
        .update({ score: (describer?.score ?? 0) + 1 })
        .eq("id", describerId),
    ]);
  } else {
    // Mauvaise réponse : celui qui a buzzé perd 1 point (le mot est perdu
    // quoi qu'il arrive, voir plus bas).
    const { data: buzzer } = await supabase
      .from("players")
      .select("score")
      .eq("id", buzzerId)
      .maybeSingle();
    await supabase
      .from("players")
      .update({ score: (buzzer?.score ?? 0) - 1 })
      .eq("id", buzzerId);
  }

  const nextPosition = turn.queue_position + 1;
  await supabase.from("turns").update({ queue_position: nextPosition }).eq("id", turnId);

  const turnFinished = nextPosition >= wordQueue.length;

  if (!turnFinished) {
    const nextWord = wordQueue[nextPosition];
    await supabase
      .from("games")
      .update({ buzzer_current_word_id: nextWord?.id ?? null, buzzer_player_id: null })
      .eq("id", gameId);

    return { success: true, data: { turnFinished: false, gameFinished: false } };
  }

  // Tour terminé : au joueur suivant qui n'a pas encore fait deviner,
  // ou fin de la partie si tout le monde est déjà passé.
  await supabase
    .from("turns")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", turnId);

  const [{ data: playerRows }, { data: turnRows }] = await Promise.all([
    supabase.from("players").select("*").eq("game_id", gameId).order("joined_at"),
    supabase.from("turns").select("player_id").eq("round_id", roundId),
  ]);
  const players = (playerRows ?? []).map(mapPlayer);
  const playedPlayerIds = new Set((turnRows ?? []).map((t) => t.player_id as string));

  const next = nextUnplayedPlayerInOrder(players, playedPlayerIds);

  if (!next) {
    await supabase
      .from("rounds")
      .update({ status: "finished", ended_at: new Date().toISOString() })
      .eq("id", roundId);
    await supabase
      .from("games")
      .update({
        status: "finished",
        current_player_id: null,
        buzzer_current_word_id: null,
        buzzer_player_id: null,
      })
      .eq("id", gameId);
    await recordBuzzerAnnualStats(supabase, gameId);

    return { success: true, data: { turnFinished: true, gameFinished: true } };
  }

  await supabase
    .from("games")
    .update({
      current_player_id: next.id,
      buzzer_current_word_id: null,
      buzzer_player_id: null,
    })
    .eq("id", gameId);

  return { success: true, data: { turnFinished: true, gameFinished: false } };
}
