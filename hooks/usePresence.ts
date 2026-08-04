"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { markPlayerDisconnected } from "@/app/actions/game-actions";

/** Le joueur doit être absent de la présence pendant au moins ce délai
 * avant qu'on considère qu'il est vraiment parti (transfert d'hôte
 * éventuel). Évite qu'un simple verrouillage d'écran, changement
 * d'application ou micro-coupure réseau ne déclenche un transfert d'hôte
 * involontaire. */
const DISCONNECT_GRACE_MS = 10_000;

/**
 * Suit la présence des joueurs sur une partie via un canal Realtime dédié.
 * Quand un joueur quitte (ferme l'onglet, perd la connexion...), les autres
 * clients encore présents détectent son départ. Un délai de grâce est
 * observé avant d'appeler markPlayerDisconnected (qui transfère l'hôte si
 * nécessaire) : si le joueur revient dans ce délai, rien ne se passe.
 *
 * Renvoie l'ensemble des identifiants de joueurs actuellement présents,
 * utilisable pour afficher un badge "en ligne" plus réactif que le simple
 * champ `is_connected` (mis à jour avec un léger différé).
 */
export function usePresence(gameId: string, playerId: string): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!gameId || !playerId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`presence:${gameId}`, {
      config: { presence: { key: playerId } },
    });

    function cancelPendingDisconnect(key: string) {
      const timer = pendingTimers.current.get(key);
      if (timer) {
        clearTimeout(timer);
        pendingTimers.current.delete(key);
      }
    }

    channel
      .on("presence", { event: "sync" }, () => {
        const presentIds = new Set(Object.keys(channel.presenceState()));
        setOnlineIds(presentIds);
        // Un joueur pour lequel un transfert d'hôte était en attente est
        // revenu : on annule.
        for (const key of presentIds) {
          cancelPendingDisconnect(key);
        }
      })
      .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        cancelPendingDisconnect(key);
        const timer = setTimeout(() => {
          pendingTimers.current.delete(key);
          // Vérifie une dernière fois qu'il n'est vraiment pas revenu
          // entre-temps avant d'agir.
          const stillAbsent = !Object.keys(channel.presenceState()).includes(key);
          if (stillAbsent) {
            void markPlayerDisconnected(gameId, key);
          }
        }, DISCONNECT_GRACE_MS);
        pendingTimers.current.set(key, timer);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ playerId, onlineAt: new Date().toISOString() });
        }
      });

    return () => {
      for (const timer of pendingTimers.current.values()) {
        clearTimeout(timer);
      }
      pendingTimers.current.clear();
      supabase.removeChannel(channel);
    };
  }, [gameId, playerId]);

  return onlineIds;
}
