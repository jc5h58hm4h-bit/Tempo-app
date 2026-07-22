import { GAME_RULES, ROUND_COUNT } from "@/types";
import type { RoundNumber, Team } from "@/types";

/** Un joueur peut-il rejoindre une partie qui compte déjà `currentCount` joueurs ? */
export function canJoinGame(currentCount: number): boolean {
  return currentCount < GAME_RULES.MAX_PLAYERS;
}

/** Un mot est-il déjà présent dans la liste (comparaison insensible à la casse) ? */
export function isDuplicateWord(existingWords: string[], candidate: string): boolean {
  const normalized = candidate.trim().toLowerCase();
  return existingWords.some((word) => word.trim().toLowerCase() === normalized);
}

/** Une manche est-elle terminée (tous les mots ont été trouvés) ? */
export function isRoundComplete(totalWords: number, guessedCount: number): boolean {
  return totalWords > 0 && guessedCount >= totalWords;
}

/** Numéro de la manche suivante, ou `null` s'il n'y en a pas (fin de partie). */
export function computeNextRoundNumber(current: RoundNumber): RoundNumber | null {
  const next = current + 1;
  return next <= ROUND_COUNT ? (next as RoundNumber) : null;
}

/** Additionne les scores de plusieurs manches pour obtenir le score final par équipe. */
export function sumRoundScores(
  rounds: { blueTeamScore: number; yellowTeamScore: number }[]
): { blue: number; yellow: number } {
  return rounds.reduce(
    (totals, round) => ({
      blue: totals.blue + round.blueTeamScore,
      yellow: totals.yellow + round.yellowTeamScore,
    }),
    { blue: 0, yellow: 0 }
  );
}

/** Détermine l'équipe gagnante à partir des scores finaux ("tie" en cas d'égalité). */
export function determineWinningTeam(blueScore: number, yellowScore: number): Team | "tie" {
  if (blueScore === yellowScore) return "tie";
  return blueScore > yellowScore ? "blue" : "yellow";
}
