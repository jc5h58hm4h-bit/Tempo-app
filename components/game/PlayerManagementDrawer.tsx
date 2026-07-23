"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { removePlayer } from "@/app/actions/round-actions";
import { TEAM_LABELS } from "@/lib/constants";
import type { Player } from "@/types";

/**
 * Petit panneau accessible uniquement à l'hôte, disponible sur tous les
 * écrans de jeu (pas seulement le salon), pour retirer un joueur bloqué
 * (parti définitivement, appareil injoignable) sans avoir à recréer une
 * partie.
 */
export function PlayerManagementDrawer({
  gameId,
  hostPlayerId,
  players,
}: {
  gameId: string;
  hostPlayerId: string;
  players: Player[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRemove(targetPlayerId: string, nickname: string) {
    const confirmed = window.confirm(`Retirer ${nickname} de la partie ?`);
    if (!confirmed) return;
    startTransition(async () => {
      await removePlayer(gameId, hostPlayerId, targetPlayerId);
    });
  }

  return (
    <div className="fixed right-4 top-4 z-50">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="rounded-full bg-ink/80 px-3 py-1.5 text-xs font-medium text-cream shadow-tile"
        aria-label="Gérer les joueurs"
      >
        Joueurs
      </button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 flex w-64 flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Gérer les joueurs</p>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fermer"
              className="text-ink/40"
            >
              ✕
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{player.nickname}</span>
                  {player.team && (
                    <span className="text-xs text-ink/40">{TEAM_LABELS[player.team]}</span>
                  )}
                </div>
                {player.id !== hostPlayerId && (
                  <button
                    disabled={isPending}
                    onClick={() => handleRemove(player.id, player.nickname)}
                    className="text-xs font-medium text-red-600 disabled:opacity-40"
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
