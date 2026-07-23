"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { removePlayer } from "@/app/actions/round-actions";
import type { Player } from "@/types";
import { GAME_RULES } from "@/types";

interface PlayerListProps {
  players: Player[];
  /** Identifiants des joueurs actuellement présents (Realtime Presence). */
  onlinePlayerIds?: Set<string>;
  /** Fourni uniquement pour l'hôte : permet d'afficher le bouton "Retirer". */
  hostRemoveProps?: { gameId: string; hostPlayerId: string };
}

export function PlayerList({ players, onlinePlayerIds, hostRemoveProps }: PlayerListProps) {
  const [isPending, startTransition] = useTransition();

  function handleRemove(targetPlayerId: string, nickname: string) {
    if (!hostRemoveProps) return;
    const confirmed = window.confirm(`Retirer ${nickname} de la partie ?`);
    if (!confirmed) return;
    startTransition(async () => {
      await removePlayer(hostRemoveProps.gameId, hostRemoveProps.hostPlayerId, targetPlayerId);
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Joueurs</h3>
        <span className="rounded-full bg-ink/5 px-3 py-1 text-sm font-medium text-ink/60">
          {players.length} joueur{players.length > 1 ? "s" : ""} sur{" "}
          {GAME_RULES.MAX_PLAYERS}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const isOnline = onlinePlayerIds ? onlinePlayerIds.has(player.id) : player.isConnected;
          const canRemove = hostRemoveProps && player.id !== hostRemoveProps.hostPlayerId;
          return (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">{player.nickname}</span>
                {player.isHost && (
                  <span className="rounded-full bg-yellow-vivid px-2 py-0.5 text-xs font-semibold text-ink">
                    Hôte
                  </span>
                )}
                {!isOnline && <span className="text-xs text-ink/40">déconnecté</span>}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    player.isReady
                      ? "bg-blue-deep text-cream"
                      : "bg-ink/10 text-ink/50"
                  }`}
                >
                  {player.isReady ? "Prêt" : "Pas prêt"}
                </span>
                {canRemove && (
                  <button
                    aria-label={`Retirer ${player.nickname}`}
                    disabled={isPending}
                    onClick={() => handleRemove(player.id, player.nickname)}
                    className="text-ink/30 hover:text-red-600 disabled:opacity-40"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
