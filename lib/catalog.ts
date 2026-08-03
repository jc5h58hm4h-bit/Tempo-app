export type CatalogCategory =
  | "marques"
  | "jeux_video"
  | "disney"
  | "sportifs"
  | "films_series"
  | "acteurs"
  | "musique"
  | "lieux_historiques"
  | "personnages_historiques"
  | "personnages_fictifs"
  | "oeuvres_artistiques"
  | "celebrites"
  | "capitales_du_monde";

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  "marques",
  "jeux_video",
  "disney",
  "sportifs",
  "films_series",
  "acteurs",
  "musique",
  "lieux_historiques",
  "personnages_historiques",
  "personnages_fictifs",
  "oeuvres_artistiques",
  "celebrites",
  "capitales_du_monde",
];

export const CATALOG_CATEGORY_LABELS: Record<CatalogCategory, string> = {
  marques: "Marques",
  jeux_video: "Jeux vidéo",
  disney: "Disney",
  sportifs: "Sportifs",
  films_series: "Films / Séries / Émissions",
  acteurs: "Acteurs & actrices",
  musique: "Musique",
  lieux_historiques: "Lieux historiques",
  personnages_historiques: "Personnages historiques",
  personnages_fictifs: "Personnages fictifs",
  oeuvres_artistiques: "Œuvres artistiques",
  celebrites: "Célébrités",
  capitales_du_monde: "Capitales du monde",
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
