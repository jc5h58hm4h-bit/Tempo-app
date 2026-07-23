import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SalonGate } from "@/components/salon/SalonGate";
import { normalizeGameCode } from "@/lib/utils";
import type { Game, Player, Word } from "@/types";

// Empêche Next.js de mettre en cache les données de cette page : le salon
// doit toujours refléter la liste de joueurs la plus à jour, sinon un
// joueur qui vient de rejoindre peut sembler absent juste après son arrivée.
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

export default async function SalonPage({
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

  const [{ data: playerRows }, { data: wordRows }] = await Promise.all([
    supabase.from("players").select("*").eq("game_id", gameRow.id).order("joined_at"),
    supabase.from("words").select("*").eq("game_id", gameRow.id).eq("is_active", true),
  ]);

  return (
    <SalonGate
      code={code}
      initialGame={mapGame(gameRow)}
      initialPlayers={(playerRows ?? []).map(mapPlayer)}
      initialWords={(wordRows ?? []).map(mapWord)}
    />
  );
}
