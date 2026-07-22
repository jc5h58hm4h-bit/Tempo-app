"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateGameCode, isValidNickname, normalizeGameCode } from "@/lib/utils";
import { canJoinGame } from "@/lib/game-rules";
import type { ActionResult } from "@/lib/action-result";
import { GAME_RULES } from "@/types";
import { DEFAULT_TURN_DURATION } from "@/lib/constants";

interface CreateGameResult {
  gameCode: string;
  playerId: string;
}

/**
 * Crée une nouvelle partie et son hôte.
 * En deux temps (partie puis joueur, puis mise à jour de host_player_id)
 * car la table games référence un joueur qui doit d'abord exister.
 * Si l'une des étapes échoue, on nettoie ce qui a été créé.
 */
export async function createGame(
  hostNickname: string
): Promise<ActionResult<CreateGameResult>> {
  const nickname = hostNickname.trim();
  if (!isValidNickname(nickname)) {
    return { success: false, error: "Pseudo invalide." };
  }

  const supabase = getSupabaseServerClient();

  // Génère un code unique (quelques tentatives en cas de collision, rare
  // vu l'espace de ~33^6 combinaisons mais on reste défensif).
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateGameCode();
    const { data: existing } = await supabase
      .from("games")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();
    if (!existing) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return { success: false, error: "Impossible de générer un code, réessaie." };
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      code,
      status: "lobby",
      turn_duration_seconds: DEFAULT_TURN_DURATION,
    })
    .select("id")
    .single();

  if (gameError || !game) {
    return { success: false, error: "Impossible de créer la partie." };
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      game_id: game.id,
      nickname,
      is_host: true,
      is_ready: false,
      is_connected: true,
    })
    .select("id")
    .single();

  if (playerError || !player) {
    await supabase.from("games").delete().eq("id", game.id);
    return { success: false, error: "Impossible de créer le joueur hôte." };
  }

  const { error: updateError } = await supabase
    .from("games")
    .update({ host_player_id: player.id })
    .eq("id", game.id);

  if (updateError) {
    await supabase.from("players").delete().eq("id", player.id);
    await supabase.from("games").delete().eq("id", game.id);
    return { success: false, error: "Impossible de finaliser la partie." };
  }

  return { success: true, data: { gameCode: code, playerId: player.id } };
}

interface JoinGameResult {
  gameCode: string;
  playerId: string;
}

/** Ajoute un joueur à une partie existante encore en salon d'attente. */
export async function joinGame(
  rawCode: string,
  rawNickname: string
): Promise<ActionResult<JoinGameResult>> {
  const code = normalizeGameCode(rawCode);
  const nickname = rawNickname.trim();

  if (code.length !== GAME_RULES.GAME_CODE_LENGTH) {
    return { success: false, error: "Code de partie invalide." };
  }
  if (!isValidNickname(nickname)) {
    return { success: false, error: "Pseudo invalide." };
  }

  const supabase = getSupabaseServerClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status")
    .eq("code", code)
    .maybeSingle();

  if (gameError || !game) {
    return { success: false, error: "Aucune partie ne correspond à ce code." };
  }
  if (game.status !== "lobby") {
    return { success: false, error: "Cette partie a déjà commencé." };
  }

  const { data: existingPlayers, error: countError } = await supabase
    .from("players")
    .select("id, nickname")
    .eq("game_id", game.id);

  if (countError || !existingPlayers) {
    return { success: false, error: "Impossible de vérifier la partie." };
  }
  if (!canJoinGame(existingPlayers.length)) {
    return { success: false, error: "La partie est déjà complète (4 joueurs max)." };
  }
  const nicknameTaken = existingPlayers.some(
    (p) => p.nickname.trim().toLowerCase() === nickname.toLowerCase()
  );
  if (nicknameTaken) {
    return { success: false, error: "Ce pseudo est déjà pris dans cette partie." };
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      game_id: game.id,
      nickname,
      is_host: false,
      is_ready: false,
      is_connected: true,
    })
    .select("id")
    .single();

  if (playerError || !player) {
    return { success: false, error: "Impossible de rejoindre la partie." };
  }

  return { success: true, data: { gameCode: code, playerId: player.id } };
}

/** Bascule le statut "prêt" / "pas prêt" d'un joueur. */
export async function setPlayerReady(
  playerId: string,
  isReady: boolean
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("players")
    .update({ is_ready: isReady })
    .eq("id", playerId);

  if (error) {
    return { success: false, error: "Impossible de mettre à jour ton statut." };
  }
  return { success: true, data: null };
}

/** Marque un joueur comme connecté (appelé à l'entrée dans le salon). */
export async function markPlayerConnected(
  playerId: string
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("players")
    .update({ is_connected: true })
    .eq("id", playerId);

  if (error) {
    return { success: false, error: "Impossible de confirmer la connexion." };
  }
  return { success: true, data: null };
}

/**
 * Marque un joueur comme déconnecté (détecté via la présence Realtime, voir
 * hooks/usePresence.ts) et transfère automatiquement le rôle d'hôte au
 * joueur connecté présent depuis le plus longtemps, si le joueur qui part
 * était l'hôte (voir section 11 du cahier des charges).
 */
export async function markPlayerDisconnected(
  gameId: string,
  playerId: string
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();

  await supabase.from("players").update({ is_connected: false }).eq("id", playerId);

  const { data: game } = await supabase
    .from("games")
    .select("host_player_id")
    .eq("id", gameId)
    .maybeSingle();

  if (game?.host_player_id !== playerId) {
    return { success: true, data: null };
  }

  const { data: nextHost } = await supabase
    .from("players")
    .select("id")
    .eq("game_id", gameId)
    .eq("is_connected", true)
    .neq("id", playerId)
    .order("joined_at")
    .limit(1)
    .maybeSingle();

  if (!nextHost) {
    // Plus aucun joueur connecté : rien à transférer pour l'instant.
    return { success: true, data: null };
  }

  await Promise.all([
    supabase.from("players").update({ is_host: false }).eq("id", playerId),
    supabase.from("players").update({ is_host: true }).eq("id", nextHost.id),
    supabase.from("games").update({ host_player_id: nextHost.id }).eq("id", gameId),
  ]);

  return { success: true, data: null };
}

/**
 * Lance la partie. Les règles d'activation (2 joueurs mini, tous prêts,
 * au moins un mot) sont déjà vérifiées côté interface, mais on les
 * revalide ici côté serveur avant de faire quoi que ce soit.
 *
 * La suite du flux (constitution des équipes) est construite en Partie 3 :
 * pour l'instant cette action fait uniquement passer le statut de la
 * partie à "team_setup" une fois les conditions réunies.
 */
export async function startGame(
  gameId: string,
  hostPlayerId: string
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();

  const { data: game } = await supabase
    .from("games")
    .select("host_player_id, status")
    .eq("id", gameId)
    .maybeSingle();

  if (!game || game.host_player_id !== hostPlayerId) {
    return { success: false, error: "Seul l'hôte peut lancer la partie." };
  }
  if (game.status !== "lobby") {
    return { success: false, error: "La partie a déjà démarré." };
  }

  const { data: players } = await supabase
    .from("players")
    .select("is_ready")
    .eq("game_id", gameId);

  if (!players || players.length < GAME_RULES.MIN_PLAYERS) {
    return { success: false, error: "Il faut au moins 2 joueurs." };
  }
  if (players.some((p) => !p.is_ready)) {
    return { success: false, error: "Tous les joueurs doivent être prêts." };
  }

  const { count: wordCount } = await supabase
    .from("words")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId)
    .eq("is_active", true);

  if (!wordCount || wordCount === 0) {
    return { success: false, error: "Ajoute au moins un mot avant de lancer la partie." };
  }

  const { error } = await supabase
    .from("games")
    .update({ status: "team_setup" })
    .eq("id", gameId);

  if (error) {
    return { success: false, error: "Impossible de lancer la partie." };
  }
  return { success: true, data: null };
}
