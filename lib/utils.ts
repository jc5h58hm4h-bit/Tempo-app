import { clsx, type ClassValue } from "clsx";
import { GAME_RULES } from "@/types";

/** Fusionne des classes Tailwind conditionnelles. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Tire un entier aléatoire entre 0 et maxExclusive - 1.
 * Utilise le générateur sécurisé du navigateur / de Node quand il existe
 * (disponible des deux côtés), en écartant les tirages qui fausseraient la
 * répartition ; sinon retombe sur Math.random.
 */
function randomInt(maxExclusive: number): number {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    let value = 0;
    do {
      webCrypto.getRandomValues(buffer);
      value = buffer[0] ?? 0;
    } while (value >= limit);
    return value % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

/**
 * Génère un code de partie numérique, ex: "483920".
 * Uniquement des chiffres, et jamais de 0 en première position : un code
 * comme "012345" risquerait de perdre son zéro dans certains outils.
 * Cela laisse 900 000 combinaisons (de 100000 à 999999).
 */
export function generateGameCode(
  length: number = GAME_RULES.GAME_CODE_LENGTH
): string {
  let code = String(1 + randomInt(9)); // premier chiffre : de 1 à 9
  for (let i = 1; i < length; i++) {
    code += String(randomInt(10));
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
    const temp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = temp;
  }
  return result;
}
