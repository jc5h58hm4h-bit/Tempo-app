export type CatalogCategory =
  | "cinema"
  | "musique"
  | "celebrites"
  | "personnages_fictifs"
  | "personnages_historiques"
  | "culture_generale";

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  "cinema",
  "musique",
  "celebrites",
  "personnages_fictifs",
  "personnages_historiques",
  "culture_generale",
];

export const CATALOG_CATEGORY_LABELS: Record<CatalogCategory, string> = {
  cinema: "Cinéma",
  musique: "Musique",
  celebrites: "Célébrités",
  personnages_fictifs: "Personnages fictifs",
  personnages_historiques: "Personnages historiques",
  culture_generale: "Culture générale",
};

export type CatalogDifficulty = "facile" | "moyen" | "difficile";

export const CATALOG_DIFFICULTIES: CatalogDifficulty[] = ["facile", "moyen", "difficile"];

export const CATALOG_DIFFICULTY_LABELS: Record<CatalogDifficulty, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
};

export const CATALOG_WORD_COUNT_OPTIONS = [10, 20, 30, 40] as const;

/** Raccourci "Chrono" : pioche directement un gros volume de mots en un coup. */
export const CHRONO_CATALOG_WORD_COUNT = 90;
/** Raccourci "Bombe" : pioche directement 60 mots en un coup. */
export const BOMBE_CATALOG_WORD_COUNT = 60;
