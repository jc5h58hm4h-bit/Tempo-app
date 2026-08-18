// Types métier partagés entre le client, les Server Actions et Supabase.
// NB : en mode "classique", la partie se joue en 2 manches (pas de manche mime) :
//   1. Description libre
//   2. Un seul mot
// En mode "chrono", il n'y a qu'un seul tour de 2 minutes par joueur (voir
// GameMode ci-dessous). En mode "bombe", les équipes et les 2 manches
// fonctionnent comme en classique, mais chaque tour dure 2 min 30 et passer
// un mot fait avancer une jauge d'explosion cachée. En mode "postit", chaque
// joueur a un mot que lui seul ne connaît pas, et doit le deviner grâce aux
// indices des autres, tour par tour.

export type Team = "blue" | "yellow";

/**
 * "classic" : 2 manches, liste de mots partagée qui s'épuise.
 * "chrono" : chaque joueur joue une seule fois, 2 minutes chrono, 3 passes
 * maximum, le but est de deviner le plus de mots possible.
 * "buzzer" : un joueur fait deviner, les autres ont chacun un buzzer.
 * Premier arrivé, premier servi : le joueur qui a buzzé dit lui-même si sa
 * réponse est juste ou fausse. 15 mots par tour, un tour par joueur.
 * "bombe" : équipes et 2 manches façon mode classique, mais chaque tour
 * dure 2 min 30 et chaque "Passer" fait avancer une jauge d'explosion
 * cachée : si elle atteint son seuil (tiré au hasard à chaque tour), le
 * tour s'arrête immédiatement, avant même la fin du chrono.
 * "postit" : chacun a un mot que lui seul ne connaît pas (façon
 * Inglourious Basterds). Pas d'équipes. Tour par tour, 1 minute : celui
 * dont c'est le tour essaie de deviner son propre mot grâce aux indices
 * donnés à voix haute par les autres, qui voient le mot affiché. Le jeu
 * tourne en boucle jusqu'à ce que tout le monde ait trouvé.
 */
export type GameMode = "classic" | "chrono" | "buzzer" | "bombe" | "postit";

export const BUZZER_WORDS_PER_TURN_OPTIONS = [10, 15, 20] as const;
export const DEFAULT_BUZZER_WORDS_PER_TURN = 15;

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

export type TurnDurationSeconds = 30 | 45 | 60 | 120 | 150;

/** Nombre de passes maximum par joueur en mode chrono (illimité en classique). */
export const CHRONO_MAX_PASSES = 3;
export const CHRONO_TURN_DURATION_SECONDS: TurnDurationSeconds = 120;

/** Mode Bombe : équipes façon mode classique, mais chaque tour dure 2 min 30
 * et passer un mot fait avancer une jauge d'explosion cachée. */
export const BOMBE_TURN_DURATION_SECONDS: TurnDurationSeconds = 150;
/** Nombre de mots suggéré par le raccourci "Bombe" dans le catalogue. */
export const BOMBE_CATALOG_WORD_COUNT = 60;
/** Seuil d'explosion tiré au hasard à chaque tour, entre ces deux bornes
 * incluses (nombre de "Passer" avant que la bombe explose). */
export const BOMBE_EXPLOSION_MIN_PASSES = 3;
export const BOMBE_EXPLOSION_MAX_PASSES = 7;

/** Mode Post-it : 1 minute par tentative, pas d'équipes. */
export const POSTIT_TURN_DURATION_SECONDS: TurnDurationSeconds = 60;

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
  /** Mode buzzer uniquement : identifiant du mot actuellement en jeu. */
  buzzerCurrentWordId: string | null;
  /** Mode buzzer uniquement : qui a buzzé en premier pour ce mot (null = personne). */
  buzzerPlayerId: string | null;
  /** Mode buzzer uniquement : nombre de mots proposés à chaque joueur qui fait deviner. */
  buzzerWordsPerTurn: number;
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
  /** A-t-il déjà utilisé son indice (1 par partie, tous modes confondus) ? */
  hintUsed: boolean;
  /** Mode Post-it uniquement : le mot qui lui a été attribué (lui seul ne
   * le connaît pas côté affichage — voir la logique côté client). */
  postitWord: string | null;
  /** Mode Post-it uniquement : a-t-il déjà trouvé son mot ? */
  postitFound: boolean;
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
  MAX_PLAYERS: 6,
  MAX_WORD_LENGTH: 40,
  GAME_CODE_LENGTH: 6,
} as const;
