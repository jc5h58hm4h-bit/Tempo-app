export type CatalogCategory = "personnalites" | "lieux" | "films_series";

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  "personnalites",
  "lieux",
  "films_series",
];

export const CATALOG_CATEGORY_LABELS: Record<CatalogCategory, string> = {
  personnalites: "Personnalités",
  lieux: "Lieux",
  films_series: "Films & Séries",
};

/** Nombre de parties récentes pendant lesquelles un mot piochée ne doit pas ressortir. */
export const CATALOG_REPEAT_EXCLUSION_GAMES = 20;

export const CATALOG_WORD_COUNT_OPTIONS = [10, 20, 30, 40] as const;
