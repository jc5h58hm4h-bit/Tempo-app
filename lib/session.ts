// Gère l'identifiant temporaire du joueur, stocké dans le navigateur.
// Permet de retrouver sa partie et son profil après un rechargement,
// sans système de compte (voir section 11 du cahier des charges).

export interface PlayerSession {
  playerId: string;
  nickname: string;
}

function storageKey(gameCode: string): string {
  return `tempo:player:${gameCode.toUpperCase()}`;
}

export function savePlayerSession(
  gameCode: string,
  session: PlayerSession
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(gameCode), JSON.stringify(session));
}

export function getPlayerSession(gameCode: string): PlayerSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey(gameCode));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function clearPlayerSession(gameCode: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(gameCode));
}
