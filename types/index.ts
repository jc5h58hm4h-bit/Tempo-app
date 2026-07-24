// Types métier partagés entre le client, les Server Actions et Supabase.
// NB : en mode "classique", la partie se joue en 2 manches (pas de manche mime) :
//   1. Description libre
//   2. Un seul mot
// En mode "chrono", il n'y a qu'un seul tour de 2 minutes par joueur (voir
// GameMode ci-dessous).

export type Team = "blue" | "yellow";

/**
 * "classic" : 2 manches, liste de mots partagée qui s'épuise.
 * "chrono" : chaque joueur joue une seule fois, 2 minutes chrono, 3 passes
 * maximum, le but est de deviner le plus de mots possible.
 */
export type GameMode = "classic" | "chrono";

export type GameStatus =
  | "lobby" // salon d'attente, la partie n'a pas démarré
  | "team_setup" // constitution des équipes
  | "in_progress" // une manche est en cours
  | "round_summary" // écran récapitulatif entre deux manches
  | "finished"; // partie terminée

/** Il y a exactement 2 manches en mode classique (1 seule en mode chrono). */
export type RoundNumber = 1 | 2;

export const ROUND_COUNT = 2;

export interface RoundDefinition {
  number: RoundNumber;
  name: string;
  description: string;
}

/** Définition figée des 2 manches, utilisée pour l'affichage et la logique. */
export const ROUND_DEFINITIONS: Record<RoundNumber, RoundDefinition> = {
  1: {
    number: 1,
    name: "Description libre",
    description:
      "Fais deviner le mot avec toutes les phrases que tu veux, sauf le mot lui-même.",
  },
  2: {
    number: 2,
    name: "Un seul mot",
    description: "Fais deviner le mot en utilisant un seul mot autorisé.",
  },
};

export type TurnDurationSeconds = 30 | 45 | 60 | 120;

/** Nombre de passes maximum par joueur en mode chrono (illimité en classique). */
export const CHRONO_MAX_PASSES = 3;
export const CHRONO_TURN_DURATION_SECONDS: TurnDurationSeconds = 120;

export interface Game {
  id: string;
  code: string;
  status: GameStatus;
  mode: GameMode;
  hostPlayerId: string;
  currentRound: RoundNumber | null;
  currentPlayerId: string | null;
  currentTeam: Team | null;
  turnDurationSeconds: TurnDurationSeconds;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  gameId: string;
  nickname: string;
  team: Team | null;
  isHost: boolean;
  isReady: boolean;
  score: number;
  joinedAt: string;
  isConnected: boolean;
}

export interface Word {
  id: string;
  gameId: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export interface Round {
  id: string;
  gameId: string;
  roundNumber: RoundNumber;
  status: "pending" | "in_progress" | "finished";
  blueTeamScore: number;
  yellowTeamScore: number;
  startedAt: string | null;
  endedAt: string | null;
}

export interface Turn {
  id: string;
  gameId: string;
  roundId: string;
  playerId: string;
  team: Team;
  score: number;
  startedAt: string | null;
  endedAt: string | null;
}

export interface GuessedWord {
  id: string;
  gameId: string;
  roundId: string;
  turnId: string;
  wordId: string;
  playerId: string;
  guessedAt: string;
}

/** Limites de la partie, réutilisées côté client et côté serveur. */
export const GAME_RULES = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  MAX_WORD_LENGTH: 40,
  GAME_CODE_LENGTH: 6,
} as const;
