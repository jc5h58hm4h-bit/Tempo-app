import { describe, it, expect } from "vitest";
import { determineNextBuzzerStarter } from "@/lib/buzzer-rotation";
import type { Player } from "@/types";

/** Fabrique un joueur factice pour les tests, avec juste les champs utiles. */
function makePlayer(id: string): Player {
  return {
    id,
    gameId: "game-1",
    nickname: id,
    team: null,
    isHost: false,
    isReady: true,
    score: 0,
    joinedAt: `2026-01-01T00:00:0${id}.000Z`,
    isConnected: true,
    hintUsed: false,
  };
}

describe("determineNextBuzzerStarter", () => {
  const players = [makePlayer("0"), makePlayer("1"), makePlayer("2")];

  it("renvoie null s'il n'y a aucun joueur", () => {
    expect(determineNextBuzzerStarter([], null)).toBeNull();
  });

  it("renvoie le premier arrivé si c'est la toute première partie Buzzer (aucun dernier joueur connu)", () => {
    expect(determineNextBuzzerStarter(players, null)?.id).toBe("0");
  });

  it("renvoie le joueur suivant dans l'ordre d'arrivée après le dernier qui a démarré", () => {
    expect(determineNextBuzzerStarter(players, "0")?.id).toBe("1");
    expect(determineNextBuzzerStarter(players, "1")?.id).toBe("2");
  });

  it("boucle sur le premier joueur après le dernier de la liste (vraie rotation)", () => {
    expect(determineNextBuzzerStarter(players, "2")?.id).toBe("0");
  });

  it("recommence au premier arrivé si le dernier joueur n'est plus dans la partie (retiré, parti)", () => {
    expect(determineNextBuzzerStarter(players, "joueur-parti")?.id).toBe("0");
  });

  it("fonctionne avec un seul joueur restant (boucle sur lui-même)", () => {
    const solo = [makePlayer("0")];
    expect(determineNextBuzzerStarter(solo, "0")?.id).toBe("0");
  });

  it("ne modifie pas le tableau de joueurs reçu en entrée", () => {
    const copy = [...players];
    determineNextBuzzerStarter(players, "1");
    expect(players).toEqual(copy);
  });
});
