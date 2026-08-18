import type { Player } from "@/types";

/**
 * Détermine le prochain joueur à qui donner le tour en mode Post-it :
 * celui qui suit dans l'ordre d'arrivée après le joueur actuel, en
 * ignorant ceux qui ont déjà trouvé leur mot. Boucle indéfiniment sur les
 * joueurs restants (le jeu continue de tourner tant que tout le monde n'a
 * pas trouvé).
 *
 * `players` doit déjà être trié par ordre d'arrivée (joined_at croissant).
 * `currentPlayerId` est celui dont c'est le tour actuellement (null en
 * tout début de partie, avant le premier tour).
 *
 * Renvoie null si tous les joueurs ont déjà trouvé leur mot (fin de partie).
 */
export function nextPostitPlayer(
  players: Player[],
  currentPlayerId: string | null
): Player | null {
  if (players.length === 0) return null;

  const startIndex = currentPlayerId
    ? players.findIndex((p) => p.id === currentPlayerId)
    : -1;

  for (let step = 1; step <= players.length; step++) {
    const index = (startIndex + step + players.length) % players.length;
    const candidate = players[index];
    if (candidate && !candidate.postitFound) {
      return candidate;
    }
  }

  return null;
}
