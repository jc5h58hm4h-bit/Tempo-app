import { describe, it, expect } from "vitest";
import { buildTurnOrder, nextPlayerInOrder, nextUnplayedPlayerInOrder } from "@/lib/turn-order";
import type { Player, Team } from "@/types";

/** Fabrique un joueur factice pour les tests, avec juste les champs utiles. */
function makePlayer(id: string, team: Team | null): Player {
  return {
    id,
    gameId: "game-1",
    nickname: id,
    team,
    isHost: false,
    isReady: true,
    score: 0,
    joinedAt: `2026-01-01T00:00:0${id}.000Z`,
    isConnected: true,
  };
}

describe("buildTurnOrder", () => {
  it("alterne les équipes pour 2 joueurs par équipe (2v2)", () => {
    const players = [
      makePlayer("0", "blue"),
      makePlayer("1", "yellow"),
      makePlayer("2", "blue"),
      makePlayer("3", "yellow"),
    ];
    const order = buildTurnOrder(players).map((p) => p.id);
    expect(order).toEqual(["0", "1", "2", "3"]);
  });

  it("fonctionne pour 1 joueur par équipe (1v1)", () => {
    const players = [makePlayer("0", "blue"), makePlayer("1", "yellow")];
    const order = buildTurnOrder(players).map((p) => p.id);
    expect(order).toEqual(["0", "1"]);
  });

  it("intercale même quand les équipes sont de tailles différentes (2v1)", () => {
    const players = [
      makePlayer("0", "blue"),
      makePlayer("1", "blue"),
      makePlayer("2", "yellow"),
    ];
    const order = buildTurnOrder(players).map((p) => p.id);
    // blue[0], yellow[0], blue[1] : l'équipe la plus petite ne bloque pas l'autre.
    expect(order).toEqual(["0", "2", "1"]);
  });

  it("renvoie un ordre vide si aucun joueur n'a d'équipe (mode Buzzer)", () => {
    const players = [makePlayer("0", null), makePlayer("1", null)];
    expect(buildTurnOrder(players)).toEqual([]);
  });

  it("ne modifie pas le tableau reçu en entrée", () => {
    const players = [makePlayer("0", "blue"), makePlayer("1", "yellow")];
    const copy = [...players];
    buildTurnOrder(players);
    expect(players).toEqual(copy);
  });
});

describe("nextPlayerInOrder", () => {
  const order = [makePlayer("0", "blue"), makePlayer("1", "yellow"), makePlayer("2", "blue")];

  it("renvoie le joueur suivant dans l'ordre", () => {
    expect(nextPlayerInOrder(order, "0")?.id).toBe("1");
    expect(nextPlayerInOrder(order, "1")?.id).toBe("2");
  });

  it("boucle sur le premier joueur après le dernier", () => {
    expect(nextPlayerInOrder(order, "2")?.id).toBe("0");
  });

  it("renvoie le premier joueur si currentPlayerId est null (début de manche)", () => {
    expect(nextPlayerInOrder(order, null)?.id).toBe("0");
  });

  it("renvoie le premier joueur si l'identifiant donné n'est pas dans l'ordre", () => {
    expect(nextPlayerInOrder(order, "joueur-parti")?.id).toBe("0");
  });

  it("renvoie null si l'ordre est vide", () => {
    expect(nextPlayerInOrder([], "0")).toBeNull();
  });
});

describe("nextUnplayedPlayerInOrder", () => {
  const order = [makePlayer("0", null), makePlayer("1", null), makePlayer("2", null)];

  it("renvoie le premier joueur qui n'a pas encore joué", () => {
    const played = new Set(["0"]);
    expect(nextUnplayedPlayerInOrder(order, played)?.id).toBe("1");
  });

  it("renvoie null quand tout le monde a déjà joué (fin de partie Chrono/Buzzer)", () => {
    const played = new Set(["0", "1", "2"]);
    expect(nextUnplayedPlayerInOrder(order, played)).toBeNull();
  });

  it("renvoie le premier joueur si personne n'a encore joué", () => {
    expect(nextUnplayedPlayerInOrder(order, new Set())?.id).toBe("0");
  });

  it("renvoie null si l'ordre est vide", () => {
    expect(nextUnplayedPlayerInOrder([], new Set())).toBeNull();
  });
});
