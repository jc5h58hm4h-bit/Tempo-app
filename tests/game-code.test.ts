import { describe, it, expect } from "vitest";
import { generateGameCode } from "@/lib/utils";
import { GAME_RULES } from "@/types";

describe("generateGameCode", () => {
  it("génère un code de la bonne longueur", () => {
    const code = generateGameCode();
    expect(code).toHaveLength(GAME_RULES.GAME_CODE_LENGTH);
  });

  it("n'utilise que des caractères non ambigus (pas de O/0/I/1)", () => {
    const code = generateGameCode();
    expect(code).not.toMatch(/[O0I1]/);
  });

  it("génère des codes différents d'un appel à l'autre", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateGameCode()));
    // Très improbable d'obtenir des collisions sur 50 tirages avec cet alphabet.
    expect(codes.size).toBeGreaterThan(45);
  });
});
