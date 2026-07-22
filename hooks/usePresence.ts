"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { markPlayerDisconnected } from "@/app/actions/game-actions";

/**
 * Suit la présence des joueurs sur une partie via un canal Realtime dédié.
 * Quand un joueur quitte (ferme l'onglet, perd la connexion...), les autres
 * clients encore présents détectent son départ et appellent
 * markPlayerDisconnected, qui transfère l'hôte si nécessaire.
 *
 * Renvoie l'ensemble des identifiants de joueurs actuellement présents,
 * utilisable pour afficher un badge "en ligne" plus réactif que le simple
 * champ `is_connected` (mis à jour avec un léger différé).
 */
export function usePresence(gameId: string, playerId: string): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!gameId || !playerId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`presence:${gameId}`, {
      config: { presence: { key: playerId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        void markPlayerDisconnected(gameId, key);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ playerId, onlineAt: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, playerId]);

  return onlineIds;
}
