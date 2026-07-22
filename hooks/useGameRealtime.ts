"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Game, Player, Round, Word } from "@/types";

interface GameRealtimeState {
  game: Game;
  players: Player[];
  words: Word[];
  rounds: Round[];
}

// --- Mappage snake_case (Supabase) -> camelCase (types applicatifs) -----

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

/**
 * Abonne le client aux changements Realtime d'une partie (games, players,
 * words) et garde un état local synchronisé. Les valeurs `initial*` servent
 * à afficher immédiatement les données déjà chargées côté serveur, avant
 * que le canal Realtime ne soit établi.
 */
export function useGameRealtime(
  gameId: string,
  initialGame: Game,
  initialPlayers: Player[],
  initialWords: Word[],
  initialRounds: Round[] = []
): GameRealtimeState {
  const [game, setGame] = useState<Game>(initialGame);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [words, setWords] = useState<Word[]>(initialWords);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          setGame(mapGame(payload.new));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        (payload) => {
          setPlayers((current) => {
            if (payload.eventType === "DELETE") {
              return current.filter((p) => p.id !== payload.old.id);
            }
            const updated = mapPlayer(payload.new);
            const withoutUpdated = current.filter((p) => p.id !== updated.id);
            return [...withoutUpdated, updated].sort(
              (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
            );
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "words", filter: `game_id=eq.${gameId}` },
        (payload) => {
          setWords((current) => {
            if (payload.eventType === "DELETE") {
              return current.filter((w) => w.id !== payload.old.id);
            }
            const updated = mapWord(payload.new);
            const withoutUpdated = current.filter((w) => w.id !== updated.id);
            return [...withoutUpdated, updated];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `game_id=eq.${gameId}` },
        (payload) => {
          setRounds((current) => {
            if (payload.eventType === "DELETE") {
              return current.filter((r) => r.id !== payload.old.id);
            }
            const updated = mapRound(payload.new);
            const withoutUpdated = current.filter((r) => r.id !== updated.id);
            return [...withoutUpdated, updated].sort((a, b) => a.roundNumber - b.roundNumber);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { game, players, words, rounds };
}
