import type { Player } from "@/types";

/**
 * Détermine qui doit démarrer le prochain tour de description en mode
 * Buzzer, en faisant tourner entre les joueurs d'une partie à l'autre
 * (avec les mêmes joueurs) plutôt que de toujours reprendre le premier
 * arrivé.
 *
 * `players` doit déjà être trié par ordre d'arrivée (joined_at croissant).
 * `lastStarterId` est l'identifiant du joueur qui a démarré la dernière
 * partie Buzzer sur ce salon (null si c'est la toute première).
 *
 * Comportement :
 * - Aucun joueur : renvoie null.
 * - Pas de dernier joueur connu (première partie) : renvoie le premier
 *   arrivé.
 * - Dernier joueur connu mais plus présent (parti, retiré) : recommence
 *   au premier arrivé plutôt que d'échouer.
 * - Dernier joueur toujours présent : renvoie le suivant dans l'ordre
 *   d'arrivée, en bouclant sur le premier après le dernier.
 */
export function determineNextBuzzerStarter(
  players: Player[],
  lastStarterId: string | null
): Player | null {
  if (players.length === 0) return null;
  if (!lastStarterId) return players[0] ?? null;

  const lastIndex = players.findIndex((p) => p.id === lastStarterId);
  if (lastIndex === -1) return players[0] ?? null;

  return players[(lastIndex + 1) % players.length] ?? null;
}
