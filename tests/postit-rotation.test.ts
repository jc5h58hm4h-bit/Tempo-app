import { describe, it, expect } from "vitest";
import { nextPostitPlayer } from "@/lib/postit-rotation";
import type { Player } from "@/types";

/** Fabrique un joueur factice pour les tests, avec juste les champs utiles. */
function makePlayer(id: string, postitFound: boolean): Player {
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
    postitWord: null,
    postitFound,
  };
}

describe("nextPostitPlayer", () => {
  it("renvoie null s'il n'y a aucun joueur", () => {
    expect(nextPostitPlayer([], null)).toBeNull();
  });

  it("renvoie le premier arrivé au tout début de la partie (aucun joueur actif connu)", () => {
    const players = [makePlayer("0", false), makePlayer("1", false), makePlayer("2", false)];
    expect(nextPostitPlayer(players, null)?.id).toBe("0");
  });

  it("passe au joueur suivant dans l'ordre d'arrivée", () => {
    const players = [makePlayer("0", false), makePlayer("1", false), makePlayer("2", false)];
    expect(nextPostitPlayer(players, "0")?.id).toBe("1");
    expect(nextPostitPlayer(players, "1")?.id).toBe("2");
  });

  it("boucle sur le premier joueur après le dernier de la liste", () => {
    const players = [makePlayer("0", false), makePlayer("1", false), makePlayer("2", false)];
    expect(nextPostitPlayer(players, "2")?.id).toBe("0");
  });

  it("saute les joueurs qui ont déjà trouvé leur mot", () => {
    const players = [makePlayer("0", false), makePlayer("1", true), makePlayer("2", false)];
    expect(nextPostitPlayer(players, "0")?.id).toBe("2");
  });

  it("peut sauter plusieurs joueurs déjà trouvés d'affilée", () => {
    const players = [
      makePlayer("0", false),
      makePlayer("1", true),
      makePlayer("2", true),
      makePlayer("3", false),
    ];
    expect(nextPostitPlayer(players, "0")?.id).toBe("3");
  });

  it("renvoie null quand tout le monde a déjà trouvé son mot (fin de partie)", () => {
    const players = [makePlayer("0", true), makePlayer("1", true)];
    expect(nextPostitPlayer(players, "0")).toBeNull();
  });

  it("revient sur le même joueur si c'est le seul restant à ne pas avoir trouvé", () => {
    const players = [makePlayer("0", false), makePlayer("1", true), makePlayer("2", true)];
    expect(nextPostitPlayer(players, "0")?.id).toBe("0");
  });

  it("ne modifie pas le tableau de joueurs reçu en entrée", () => {
    const players = [makePlayer("0", false), makePlayer("1", false)];
    const copy = [...players];
    nextPostitPlayer(players, "0");
    expect(players).toEqual(copy);
  });
});
