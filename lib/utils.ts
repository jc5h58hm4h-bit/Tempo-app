import { clsx, type ClassValue } from "clsx";
import { GAME_RULES } from "@/types";

/** Fusionne des classes Tailwind conditionnelles. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans O/0/I/1 (ambigus)

/** Génère un code de partie court et lisible, ex: "AB12CD". */
export function generateGameCode(
  length: number = GAME_RULES.GAME_CODE_LENGTH
): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Normalise un code saisi par l'utilisateur (majuscules, sans espaces). */
export function normalizeGameCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Valide un pseudonyme (ni vide, ni trop long). */
export function isValidNickname(nickname: string): boolean {
  const trimmed = nickname.trim();
  return trimmed.length > 0 && trimmed.length <= 20;
}

/** Mélange un tableau (Fisher-Yates) sans muter l'original. */
export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
