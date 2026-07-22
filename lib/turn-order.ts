import type { Player } from "@/types";

/**
 * Construit l'ordre de passage des joueurs pour une manche, en alternant
 * autant que possible les deux équipes (ex: bleu, jaune, bleu, jaune...).
 * Déterministe à partir de la liste de joueurs (triée par date d'entrée),
 * donc calculable indépendamment par chaque client sans coordination.
 */
export function buildTurnOrder(players: Player[]): Player[] {
  const blue = players.filter((p) => p.team === "blue");
  const yellow = players.filter((p) => p.team === "yellow");
  const order: Player[] = [];
  const max = Math.max(blue.length, yellow.length);

  for (let i = 0; i < max; i++) {
    const bluePlayer = blue[i];
    const yellowPlayer = yellow[i];
    if (bluePlayer) order.push(bluePlayer);
    if (yellowPlayer) order.push(yellowPlayer);
  }
  return order;
}

/** Renvoie le joueur suivant dans l'ordre de passage. */
export function nextPlayerInOrder(
  order: Player[],
  currentPlayerId: string | null
): Player | null {
  if (order.length === 0) return null;
  if (!currentPlayerId) return order[0];
  const currentIndex = order.findIndex((p) => p.id === currentPlayerId);
  if (currentIndex === -1) return order[0];
  return order[(currentIndex + 1) % order.length];
}
