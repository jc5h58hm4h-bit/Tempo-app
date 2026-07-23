import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PartieGate } from "@/components/game/PartieGate";
import { normalizeGameCode } from "@/lib/utils";
import type { Game, Player, Round, Word } from "@/types";

// Empêche Next.js de mettre en cache les données de cette page : la partie
// doit toujours refléter l'état le plus à jour (joueurs, statut, manche).
export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapGame(row: any): Game {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    hostPlayerId: row.host_player_id,
    currentRound: row.current_round,
    currentPlayerId: row.current_player_id,
    currentTeam: row.current_team,
    turnDurationSeconds: row.turn_duration_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

function mapWord(row: any): Word {
  return {
    id: row.id,
    gameId: row.game_id,
    content: row.content,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapRound(row: any): Round {
  return {
    id: row.id,
    gameId: row.game_id,
    roundNumber: row.round_number,
    status: row.status,
    blueTeamScore: row.blue_team_score,
    yellowTeamScore: row.yellow_team_score,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export default async function PartiePage({
  params,
}: {
  params: { code: string };
}) {
  const code = normalizeGameCode(params.code);
  const supabase = getSupabaseServerClient();

  const { data: gameRow } = await supabase
    .from("games")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!gameRow) {
    notFound();
  }

  const [{ data: playerRows }, { data: wordRows }, { data: roundRows }] = await Promise.all([
    supabase.from("players").select("*").eq("game_id", gameRow.id).order("joined_at"),
    supabase.from("words").select("*").eq("game_id", gameRow.id).eq("is_active", true),
    supabase.from("rounds").select("*").eq("game_id", gameRow.id).order("round_number"),
  ]);

  return (
    <PartieGate
      code={code}
      initialGame={mapGame(gameRow)}
      initialPlayers={(playerRows ?? []).map(mapPlayer)}
      initialWords={(wordRows ?? []).map(mapWord)}
      initialRounds={(roundRows ?? []).map(mapRound)}
    />
  );
}
