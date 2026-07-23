import type { TurnDurationSeconds } from "@/types";

/**
 * Nom affiché de l'application.
 * C'est le SEUL endroit à modifier pour renommer l'application
 * (page d'accueil, manifest PWA, métadonnées).
 */
export const APP_NAME = "Tempo";

export const APP_DESCRIPTION =
  "Le jeu de mots à faire deviner, entre 2 et 4 joueurs.";

export const TURN_DURATION_OPTIONS: TurnDurationSeconds[] = [30, 45, 60];

export const DEFAULT_TURN_DURATION: TurnDurationSeconds = 30;

export const TEAM_LABELS = {
  blue: "Équipe bleue",
  yellow: "Équipe jaune",
} as const;

/**
 * Liste de pseudos prédéfinis proposés à l'accueil, pour aller plus vite
 * plutôt que de taper son prénom à chaque partie.
 */
export const PRESET_NICKNAMES = ["Florian", "Guillaume", "Pierre", "Antoine", "Camille"];
