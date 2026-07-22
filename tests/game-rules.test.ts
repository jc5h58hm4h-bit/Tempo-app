import { describe, it, expect } from "vitest";
import {
  canJoinGame,
  isDuplicateWord,
  isRoundComplete,
  computeNextRoundNumber,
  sumRoundScores,
  determineWinningTeam,
} from "@/lib/game-rules";

describe("canJoinGame", () => {
  it("autorise à rejoindre en dessous de 4 joueurs", () => {
    expect(canJoinGame(0)).toBe(true);
    expect(canJoinGame(3)).toBe(true);
  });

  it("refuse de dépasser 4 joueurs", () => {
    expect(canJoinGame(4)).toBe(false);
    expect(canJoinGame(5)).toBe(false);
  });
});

describe("isDuplicateWord", () => {
  it("détecte un doublon insensible à la casse et aux espaces", () => {
    expect(isDuplicateWord(["Pizza", "Tour Eiffel"], "pizza")).toBe(true);
    expect(isDuplicateWord(["Pizza"], "  Pizza  ")).toBe(true);
  });

  it("n'est pas déclenché par un mot différent", () => {
    expect(isDuplicateWord(["Pizza"], "Sushi")).toBe(false);
  });
});

describe("isRoundComplete", () => {
  it("n'est pas terminée tant qu'il reste des mots", () => {
    expect(isRoundComplete(10, 4)).toBe(false);
  });

  it("est terminée quand tous les mots ont été trouvés", () => {
    expect(isRoundComplete(10, 10)).toBe(true);
  });

  it("n'est jamais terminée si la partie n'a aucun mot", () => {
    expect(isRoundComplete(0, 0)).toBe(false);
  });
});

describe("computeNextRoundNumber", () => {
  it("passe de la manche 1 à la manche 2", () => {
    expect(computeNextRoundNumber(1)).toBe(2);
  });

  it("n'y a pas de manche après la 2 (pas de manche mime)", () => {
    expect(computeNextRoundNumber(2)).toBeNull();
  });
});

describe("sumRoundScores", () => {
  it("additionne les scores de chaque manche par équipe", () => {
    const totals = sumRoundScores([
      { blueTeamScore: 5, yellowTeamScore: 3 },
      { blueTeamScore: 2, yellowTeamScore: 6 },
    ]);
    expect(totals).toEqual({ blue: 7, yellow: 9 });
  });
});

describe("determineWinningTeam", () => {
  it("désigne l'équipe bleue si elle a le meilleur score", () => {
    expect(determineWinningTeam(10, 6)).toBe("blue");
  });

  it("désigne l'équipe jaune si elle a le meilleur score", () => {
    expect(determineWinningTeam(4, 9)).toBe("yellow");
  });

  it("détecte une égalité", () => {
    expect(determineWinningTeam(7, 7)).toBe("tie");
  });
});
