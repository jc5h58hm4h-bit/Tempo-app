"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { shuffleArray } from "@/lib/utils";
import { buildTurnOrder, nextPlayerInOrder } from "@/lib/turn-order";
import { isRoundComplete, computeNextRoundNumber } from "@/lib/game-rules";
import type { ActionResult } from "@/lib/action-result";
import type { Player, Team } from "@/types";

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

// --- Équipes ---------------------------------------------------------

/**
 * Constitue automatiquement deux équipes équilibrées.
 * Avec 2 joueurs : chacun forme sa propre équipe.
 * Avec 3 ou 4 joueurs : répartition la plus équilibrée possible.
 */
export async function assignTeamsAuto(
  gameId: string,
  hostPlayerId: string
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();
  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut constituer les équipes." };
  }

  const { data: playerRows } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .order("joined_at");

  const players = (playerRows ?? []).map(mapPlayer);
  if (players.length < 2) {
    return { success: false, error: "Il faut au moins 2 joueurs." };
  }

  const shuffled = shuffleArray(players);
  const updates = shuffled.map((player, index) => {
    const team: Team = index % 2 === 0 ? "blue" : "yellow";
    return supabase.from("players").update({ team }).eq("id", player.id);
  });

  const results = await Promise.all(updates);
  if (results.some((r) => r.error)) {
    return { success: false, error: "Impossible de constituer les équipes." };
  }
  return { success: true, data: null };
}

/** Constitue les équipes selon une répartition choisie manuellement par l'hôte. */
export async function assignTeamsManual(
  gameId: string,
  hostPlayerId: string,
  assignments: { playerId: string; team: Team }[]
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();
  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut constituer les équipes." };
  }
  if (assignments.length === 0) {
    return { success: false, error: "Aucune répartition fournie." };
  }

  const results = await Promise.all(
    assignments.map(({ playerId, team }) =>
      supabase.from("players").update({ team }).eq("id", playerId).eq("game_id", gameId)
    )
  );
  if (results.some((r) => r.error)) {
    return { success: false, error: "Impossible d'enregistrer les équipes." };
  }
  return { success: true, data: null };
}

// --- Démarrage des manches --------------------------------------------

interface StartRoundResult {
  roundId: string;
  currentPlayerId: string;
  currentTeam: Team;
}

/** Démarre la manche 1 une fois les équipes constituées. */
export async function startGameRounds(
  gameId: string,
  hostPlayerId: string
): Promise<ActionResult<StartRoundResult>> {
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

  if (players.some((p) => p.team === null)) {
    return { success: false, error: "Tous les joueurs doivent appartenir à une équipe." };
  }

  const order = buildTurnOrder(players);
  const first = order[0];
  if (!first || !first.team) {
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
      current_team: first.team,
    })
    .eq("id", gameId);

  if (gameError) {
    return { success: false, error: "Impossible de démarrer la partie." };
  }

  return {
    success: true,
    data: { roundId: round.id, currentPlayerId: first.id, currentTeam: first.team },
  };
}

// --- Tours de jeu -------------------------------------------------------

interface StartTurnResult {
  turnId: string;
  wordQueue: { id: string; content: string }[];
}

/** Démarre un tour : crée la ligne "turns" et renvoie la pile de mots restants, mélangée. */
export async function startTurn(
  gameId: string,
  roundId: string,
  playerId: string,
  team: Team
): Promise<ActionResult<StartTurnResult>> {
  const supabase = getSupabaseServerClient();

  const { data: turn, error: turnError } = await supabase
    .from("turns")
    .insert({
      game_id: gameId,
      round_id: roundId,
      player_id: playerId,
      team,
      score: 0,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (turnError || !turn) {
    return { success: false, error: "Impossible de démarrer le tour." };
  }

  const [{ data: words }, { data: guessed }] = await Promise.all([
    supabase.from("words").select("id, content").eq("game_id", gameId).eq("is_active", true),
    supabase.from("guessed_words").select("word_id").eq("round_id", roundId),
  ]);

  const guessedIds = new Set((guessed ?? []).map((g) => g.word_id));
  const remaining = (words ?? []).filter((w) => !guessedIds.has(w.id));

  return {
    success: true,
    data: { turnId: turn.id, wordQueue: shuffleArray(remaining) },
  };
}

interface GuessResult {
  blueTeamScore: number;
  yellowTeamScore: number;
  remainingWords: number;
  roundComplete: boolean;
}

/** Enregistre un mot trouvé : score joueur + équipe, détecte la fin de manche. */
export async function recordGuessedWord(
  gameId: string,
  roundId: string,
  turnId: string,
  wordId: string,
  playerId: string,
  team: Team
): Promise<ActionResult<GuessResult>> {
  const supabase = getSupabaseServerClient();

  const { error: insertError } = await supabase.from("guessed_words").insert({
    game_id: gameId,
    round_id: roundId,
    turn_id: turnId,
    word_id: wordId,
    player_id: playerId,
  });
  if (insertError) {
    return { success: false, error: "Impossible d'enregistrer le mot trouvé." };
  }

  const { data: player } = await supabase
    .from("players")
    .select("score")
    .eq("id", playerId)
    .maybeSingle();
  await supabase
    .from("players")
    .update({ score: (player?.score ?? 0) + 1 })
    .eq("id", playerId);

  const scoreColumn = team === "blue" ? "blue_team_score" : "yellow_team_score";
  const { data: round } = await supabase
    .from("rounds")
    .select("blue_team_score, yellow_team_score")
    .eq("id", roundId)
    .maybeSingle();
  const currentTeamScore =
    team === "blue" ? round?.blue_team_score ?? 0 : round?.yellow_team_score ?? 0;
  await supabase
    .from("rounds")
    .update({ [scoreColumn]: currentTeamScore + 1 })
    .eq("id", roundId);

  const [{ count: totalWords }, { count: guessedCount }] = await Promise.all([
    supabase
      .from("words")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("is_active", true),
    supabase
      .from("guessed_words")
      .select("id", { count: "exact", head: true })
      .eq("round_id", roundId),
  ]);

  const remainingWords = (totalWords ?? 0) - (guessedCount ?? 0);
  const roundComplete = isRoundComplete(totalWords ?? 0, guessedCount ?? 0);

  return {
    success: true,
    data: {
      blueTeamScore: team === "blue" ? currentTeamScore + 1 : round?.blue_team_score ?? 0,
      yellowTeamScore:
        team === "yellow" ? currentTeamScore + 1 : round?.yellow_team_score ?? 0,
      remainingWords,
      roundComplete,
    },
  };
}

interface EndTurnResult {
  gameStatus: "in_progress" | "round_summary" | "finished";
  nextPlayerId: string | null;
  nextTeam: Team | null;
}

/**
 * Termine le tour courant (temps écoulé ou manche complétée) et fait avancer
 * la partie : joueur suivant, ou passage à l'écran de fin de manche / partie.
 */
export async function endTurn(
  gameId: string,
  roundId: string,
  turnId: string,
  wordsFoundCount: number,
  roundComplete: boolean
): Promise<ActionResult<EndTurnResult>> {
  const supabase = getSupabaseServerClient();

  await supabase
    .from("turns")
    .update({ score: wordsFoundCount, ended_at: new Date().toISOString() })
    .eq("id", turnId);

  if (roundComplete) {
    const { data: round } = await supabase
      .from("rounds")
      .select("round_number")
      .eq("id", roundId)
      .maybeSingle();

    await supabase
      .from("rounds")
      .update({ status: "finished", ended_at: new Date().toISOString() })
      .eq("id", roundId);

    const isFinalRound = computeNextRoundNumber((round?.round_number ?? 1) as 1 | 2) === null;
    const newStatus = isFinalRound ? "finished" : "round_summary";

    await supabase
      .from("games")
      .update({ status: newStatus, current_player_id: null, current_team: null })
      .eq("id", gameId);

    return {
      success: true,
      data: { gameStatus: newStatus, nextPlayerId: null, nextTeam: null },
    };
  }

  const { data: playerRows } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .order("joined_at");
  const players = (playerRows ?? []).map(mapPlayer);
  const order = buildTurnOrder(players);

  const { data: game } = await supabase
    .from("games")
    .select("current_player_id")
    .eq("id", gameId)
    .maybeSingle();

  const next = nextPlayerInOrder(order, game?.current_player_id ?? null);
  if (!next || !next.team) {
    return { success: false, error: "Impossible de déterminer le joueur suivant." };
  }

  await supabase
    .from("games")
    .update({ current_player_id: next.id, current_team: next.team })
    .eq("id", gameId);

  return {
    success: true,
    data: { gameStatus: "in_progress", nextPlayerId: next.id, nextTeam: next.team },
  };
}

/** Démarre la manche suivante après l'écran récapitulatif. */
export async function startNextRound(
  gameId: string,
  hostPlayerId: string
): Promise<ActionResult<StartRoundResult>> {
  const supabase = getSupabaseServerClient();
  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut lancer la manche suivante." };
  }

  const { data: game } = await supabase
    .from("games")
    .select("current_round, status")
    .eq("id", gameId)
    .maybeSingle();

  if (!game || game.status !== "round_summary") {
    return { success: false, error: "La partie n'est pas prête pour la manche suivante." };
  }

  const nextRoundNumber = computeNextRoundNumber((game.current_round ?? 1) as 1 | 2);
  if (nextRoundNumber === null) {
    return { success: false, error: "Il n'y a plus de manche à jouer." };
  }

  const { data: playerRows } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .order("joined_at");
  const players = (playerRows ?? []).map(mapPlayer);
  const order = buildTurnOrder(players);
  const first = order[0];
  if (!first || !first.team) {
    return { success: false, error: "Impossible de déterminer le premier joueur." };
  }

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      game_id: gameId,
      round_number: nextRoundNumber,
      status: "in_progress",
      blue_team_score: 0,
      yellow_team_score: 0,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (roundError || !round) {
    return { success: false, error: "Impossible de créer la manche suivante." };
  }

  await supabase
    .from("games")
    .update({
      status: "in_progress",
      current_round: nextRoundNumber,
      current_player_id: first.id,
      current_team: first.team,
    })
    .eq("id", gameId);

  return {
    success: true,
    data: { roundId: round.id, currentPlayerId: first.id, currentTeam: first.team },
  };
}

/** Relance une partie terminée avec les mêmes mots et les mêmes équipes. */
export async function replaySameWords(
  gameId: string,
  hostPlayerId: string
): Promise<ActionResult<StartRoundResult>> {
  const supabase = getSupabaseServerClient();
  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut relancer une partie." };
  }

  const { data: oldRounds } = await supabase
    .from("rounds")
    .select("id")
    .eq("game_id", gameId);
  const oldRoundIds = (oldRounds ?? []).map((r) => r.id);

  if (oldRoundIds.length > 0) {
    await supabase.from("guessed_words").delete().in("round_id", oldRoundIds);
    await supabase.from("turns").delete().in("round_id", oldRoundIds);
    await supabase.from("rounds").delete().in("id", oldRoundIds);
  }

  await supabase.from("players").update({ score: 0 }).eq("game_id", gameId);

  const { data: playerRows } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .order("joined_at");
  const players = (playerRows ?? []).map(mapPlayer);
  const order = buildTurnOrder(players);
  const first = order[0];
  if (!first || !first.team) {
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
    return { success: false, error: "Impossible de relancer la partie." };
  }

  await supabase
    .from("games")
    .update({
      status: "in_progress",
      current_round: 1,
      current_player_id: first.id,
      current_team: first.team,
    })
    .eq("id", gameId);

  return {
    success: true,
    data: { roundId: round.id, currentPlayerId: first.id, currentTeam: first.team },
  };
}
