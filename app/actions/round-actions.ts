"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { shuffleArray } from "@/lib/utils";
import { buildTurnOrder, nextPlayerInOrder, nextUnplayedPlayerInOrder } from "@/lib/turn-order";
import { isRoundComplete, computeNextRoundNumber } from "@/lib/game-rules";
import { DEFAULT_TURN_DURATION } from "@/lib/constants";
import type { ActionResult } from "@/lib/action-result";
import type { GameMode, Player, Team } from "@/types";
import { CHRONO_TURN_DURATION_SECONDS, GAME_RULES } from "@/types";

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
 * Retrouve l'équipe qui a trouvé le tout dernier mot d'une manche donnée
 * (celle qui a "terminé" la manche). Renvoie null si indéterminable
 * (ex: aucun mot trouvé, ou manche introuvable).
 */
async function determineFinishingTeam(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  gameId: string,
  roundNumber: number | null
): Promise<Team | null> {
  if (!roundNumber) return null;

  const { data: round } = await supabase
    .from("rounds")
    .select("id")
    .eq("game_id", gameId)
    .eq("round_number", roundNumber)
    .maybeSingle();
  if (!round) return null;

  const { data: lastGuess } = await supabase
    .from("guessed_words")
    .select("turn_id")
    .eq("round_id", round.id)
    .order("guessed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastGuess) return null;

  const { data: turn } = await supabase
    .from("turns")
    .select("team")
    .eq("id", lastGuess.turn_id)
    .maybeSingle();

  return (turn?.team as Team | undefined) ?? null;
}

function opposingTeam(team: Team): Team {
  return team === "blue" ? "yellow" : "blue";
}

/**
 * À la toute fin d'une partie, calcule les mots devinés par chaque joueur
 * (créditant le coéquipier qui devinait, pas celui qui faisait deviner —
 * même logique que l'écran de fin de partie) et cumule ça dans la table
 * player_stats, par pseudo et par année. Cette table est indépendante des
 * parties elles-mêmes, donc elle survit au nettoyage automatique.
 */
async function recordAnnualStats(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  gameId: string
): Promise<void> {
  const { data: playerRows } = await supabase
    .from("players")
    .select("id, nickname, team")
    .eq("game_id", gameId);
  const players = playerRows ?? [];
  if (players.length === 0) return;

  const { data: guessedRows } = await supabase
    .from("guessed_words")
    .select("player_id")
    .eq("game_id", gameId);

  const teammateOf: Record<string, string> = {};
  for (const team of ["blue", "yellow"] as const) {
    const members = players.filter((p) => p.team === team);
    const first = members[0];
    const second = members[1];
    if (first && second) {
      teammateOf[first.id] = second.id;
      teammateOf[second.id] = first.id;
    } else if (first) {
      teammateOf[first.id] = first.id;
    }
  }

  const guessedCountByPlayerId: Record<string, number> = {};
  for (const row of guessedRows ?? []) {
    const describerId = row.player_id as string;
    const guesserId = teammateOf[describerId] ?? describerId;
    guessedCountByPlayerId[guesserId] = (guessedCountByPlayerId[guesserId] ?? 0) + 1;
  }

  const year = new Date().getFullYear();

  await Promise.all(
    players.map(async (player) => {
      const wordsGuessed = guessedCountByPlayerId[player.id] ?? 0;

      const { data: existing } = await supabase
        .from("player_stats")
        .select("id, words_guessed, games_played")
        .eq("nickname", player.nickname)
        .eq("year", year)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("player_stats")
          .update({
            words_guessed: existing.words_guessed + wordsGuessed,
            games_played: existing.games_played + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("player_stats").insert({
          nickname: player.nickname,
          year,
          words_guessed: wordsGuessed,
          games_played: 1,
        });
      }
    })
  );
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

/**
 * Change le mode de la partie (classique ou chrono), avant le lancement.
 * Appelée depuis l'écran de constitution des équipes.
 */
export async function setGameMode(
  gameId: string,
  hostPlayerId: string,
  mode: GameMode
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();
  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut changer le mode de jeu." };
  }

  const { error } = await supabase.from("games").update({ mode }).eq("id", gameId);
  if (error) {
    return { success: false, error: "Impossible de changer le mode de jeu." };
  }
  return { success: true, data: null };
}

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

  const { data: gameRow } = await supabase
    .from("games")
    .select("mode")
    .eq("id", gameId)
    .maybeSingle();
  const mode: GameMode = (gameRow?.mode as GameMode) ?? "classic";

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
      turn_duration_seconds:
        mode === "chrono" ? CHRONO_TURN_DURATION_SECONDS : DEFAULT_TURN_DURATION,
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
 * Termine le tour courant (temps écoulé ou pile de mots épuisée) et fait
 * avancer la partie : joueur suivant, ou passage à l'écran de fin de
 * manche / partie. Le comportement diffère selon le mode :
 * - "classic" : la pile de mots épuisée termine toute la manche (round
 *   partagé entre les joueurs).
 * - "chrono" : chaque joueur ne joue qu'une fois ; la pile de mots vide ne
 *   termine QUE le tour de ce joueur, pas la partie. La partie se termine
 *   quand tout le monde a joué son unique tour.
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

  const { data: gameRow } = await supabase
    .from("games")
    .select("mode, current_player_id")
    .eq("id", gameId)
    .maybeSingle();
  const mode: GameMode = (gameRow?.mode as GameMode) ?? "classic";

  // --- Mode chrono ------------------------------------------------------
  if (mode === "chrono") {
    const [{ data: playerRows }, { data: turnRows }] = await Promise.all([
      supabase.from("players").select("*").eq("game_id", gameId).order("joined_at"),
      supabase.from("turns").select("player_id").eq("round_id", roundId),
    ]);
    const players = (playerRows ?? []).map(mapPlayer);
    const order = buildTurnOrder(players);
    const playedPlayerIds = new Set((turnRows ?? []).map((t) => t.player_id as string));

    const next = nextUnplayedPlayerInOrder(order, playedPlayerIds);

    if (!next) {
      // Tout le monde a joué son tour : fin de la partie chrono.
      await supabase
        .from("rounds")
        .update({ status: "finished", ended_at: new Date().toISOString() })
        .eq("id", roundId);
      await supabase
        .from("games")
        .update({ status: "finished", current_player_id: null, current_team: null })
        .eq("id", gameId);
      await recordAnnualStats(supabase, gameId);

      return {
        success: true,
        data: { gameStatus: "finished", nextPlayerId: null, nextTeam: null },
      };
    }

    if (!next.team) {
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

  // --- Mode classique (comportement d'origine, inchangé) -----------------
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

    if (isFinalRound) {
      await recordAnnualStats(supabase, gameId);
    }

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

  const next = nextPlayerInOrder(order, gameRow?.current_player_id ?? null);
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

  // L'équipe qui a trouvé le dernier mot de la manche précédente ne doit
  // pas démarrer la manche suivante : c'est à l'équipe adverse de commencer.
  const finishingTeam = await determineFinishingTeam(supabase, gameId, game.current_round);
  const startingTeam = finishingTeam ? opposingTeam(finishingTeam) : null;
  const first =
    (startingTeam ? order.find((p) => p.team === startingTeam) : undefined) ?? order[0];

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

/**
 * Démarre une toute nouvelle partie avec les mêmes joueurs et le même code
 * (pas besoin de repartager une invitation) : vide la liste de mots et
 * l'historique des manches, remet les scores à zéro, et renvoie tout le
 * monde au salon d'attente pour choisir une nouvelle liste de mots et
 * reconstituer les équipes si besoin.
 */
export async function newGameSamePlayers(
  gameId: string,
  hostPlayerId: string
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();
  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut démarrer une nouvelle partie." };
  }

  const { data: game } = await supabase
    .from("games")
    .select("status")
    .eq("id", gameId)
    .maybeSingle();
  if (!game || game.status !== "finished") {
    return { success: false, error: "La partie précédente n'est pas encore terminée." };
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

  await supabase.from("words").delete().eq("game_id", gameId);

  await supabase
    .from("players")
    .update({ score: 0, is_ready: false, team: null })
    .eq("game_id", gameId);

  const { error } = await supabase
    .from("games")
    .update({
      status: "lobby",
      current_round: null,
      current_player_id: null,
      current_team: null,
    })
    .eq("id", gameId);

  if (error) {
    return { success: false, error: "Impossible de démarrer une nouvelle partie." };
  }
  return { success: true, data: null };
}

/**
 * Retire un joueur de la partie, à la demande de l'hôte (ex: joueur parti
 * définitivement, appareil injoignable). Si c'était son tour de faire
 * deviner, la partie avance automatiquement vers le joueur suivant avant de
 * le retirer. Si trop peu de joueurs restent pour continuer, la partie est
 * renvoyée au salon d'attente.
 *
 * Limite connue : retirer un joueur supprime aussi son historique de tours
 * et de mots trouvés (contrainte de clé étrangère), ce qui peut faire
 * réapparaître un mot déjà trouvé par ce joueur dans la pile restante de la
 * manche en cours. Effet secondaire mineur, accepté pour garder l'action
 * simple et fiable.
 */
export async function removePlayer(
  gameId: string,
  hostPlayerId: string,
  targetPlayerId: string
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();
  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut retirer un joueur." };
  }
  if (targetPlayerId === hostPlayerId) {
    return { success: false, error: "L'hôte ne peut pas se retirer lui-même." };
  }

  const { data: game } = await supabase
    .from("games")
    .select("status, current_player_id")
    .eq("id", gameId)
    .maybeSingle();
  if (!game) {
    return { success: false, error: "Partie introuvable." };
  }

  const wasActivePlayer = game.current_player_id === targetPlayerId;

  // Si c'est ce joueur qui doit décrire en ce moment, on fait avancer la
  // partie vers le joueur suivant AVANT de le retirer.
  if (game.status === "in_progress" && wasActivePlayer) {
    const { data: playerRows } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", gameId)
      .order("joined_at");
    const remaining = (playerRows ?? [])
      .map(mapPlayer)
      .filter((p) => p.id !== targetPlayerId);
    const order = buildTurnOrder(remaining);
    const next = order[0];

    if (next && next.team) {
      await supabase
        .from("games")
        .update({ current_player_id: next.id, current_team: next.team })
        .eq("id", gameId);
    } else {
      await supabase
        .from("games")
        .update({ current_player_id: null, current_team: null })
        .eq("id", gameId);
    }
  }

  const { error: deleteError } = await supabase
    .from("players")
    .delete()
    .eq("id", targetPlayerId)
    .eq("game_id", gameId);
  if (deleteError) {
    return { success: false, error: "Impossible de retirer ce joueur." };
  }

  // Plus assez de joueurs pour continuer : retour au salon d'attente.
  const { count: remainingCount } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId);

  if ((remainingCount ?? 0) < GAME_RULES.MIN_PLAYERS && game.status !== "lobby") {
    await supabase
      .from("games")
      .update({
        status: "lobby",
        current_round: null,
        current_player_id: null,
        current_team: null,
      })
      .eq("id", gameId);
  }

  return { success: true, data: null };
}
