"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isDuplicateWord } from "@/lib/game-rules";
import { shuffleArray } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";
import type { CatalogCategory, CatalogDifficulty } from "@/lib/catalog";

async function assertIsHost(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  gameId: string,
  playerId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("games")
    .select("host_player_id")
    .eq("id", gameId)
    .maybeSingle();
  return data?.host_player_id === playerId;
}

interface PickResult {
  added: number;
  /** Nombre de mots qui ont dû relancer un nouveau cycle pour leur
   * catégorie/difficulté (tous les autres mots de ce lot avaient déjà été
   * piochés au moins une fois). */
  startedNewCycle: number;
}

interface CatalogWordRow {
  id: string;
  content: string;
  hint: string | null;
  category: string;
  difficulty: string;
  used_in_cycle: boolean;
}

/** Taille d'une page de résultats demandée à Supabase, et nombre maximum de
 * pages lues (garde-fou contre une boucle infinie). */
const CATALOG_PAGE_SIZE = 1000;
const CATALOG_MAX_PAGES = 20;

/**
 * Charge TOUS les mots du catalogue correspondant aux catégories et
 * difficultés choisies, page par page.
 *
 * Pourquoi : Supabase plafonne chaque requête à 1000 lignes par défaut. Avec
 * un catalogue de plus de 3 000 mots, une seule requête ne renvoyait qu'une
 * partie arbitraire du catalogue : certaines catégories n'étaient presque
 * jamais tirées (ex : Personnages historiques). Le tri par identifiant
 * garantit que les pages se suivent sans trou ni doublon. On continue
 * jusqu'à recevoir une page vide, ce qui reste correct même si le plafond du
 * serveur est inférieur à la taille de page demandée.
 */
async function fetchAllCatalogWords(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  categories: CatalogCategory[],
  difficulties: CatalogDifficulty[]
): Promise<CatalogWordRow[] | null> {
  const all: CatalogWordRow[] = [];
  let from = 0;

  for (let page = 0; page < CATALOG_MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from("catalog_words")
      .select("id, content, hint, category, difficulty, used_in_cycle")
      .in("category", categories)
      .in("difficulty", difficulties)
      .order("id", { ascending: true })
      .range(from, from + CATALOG_PAGE_SIZE - 1);

    if (error) return null;

    const rows = (data ?? []) as CatalogWordRow[];
    if (rows.length === 0) break;

    all.push(...rows);
    from += rows.length;
  }

  return all;
}

/**
 * Pioche des mots aléatoires dans le catalogue partagé, pour les catégories
 * ET les niveaux de difficulté choisis par l'hôte.
 *
 * Règle anti-répétition : un mot ne peut ressortir qu'une fois que TOUS les
 * mots de sa catégorie ET de sa difficulté ont déjà été piochés au moins une
 * fois (used_in_cycle=true partout dans ce sous-groupe). Dès que c'est le
 * cas, le cycle recommence pour ce sous-groupe précis : tous ses mots
 * redeviennent disponibles, sauf ceux qu'on vient de piocher à l'instant qui
 * restent marqués comme utilisés pour le nouveau cycle qui démarre. Chaque
 * combinaison catégorie/difficulté a son propre cycle indépendant.
 */
export async function pickWordsFromCatalog(
  gameId: string,
  hostPlayerId: string,
  categories: CatalogCategory[],
  difficulties: CatalogDifficulty[],
  count: number
): Promise<ActionResult<PickResult>> {
  const supabase = getSupabaseServerClient();

  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut gérer la liste de mots." };
  }
  if (categories.length === 0) {
    return { success: false, error: "Choisis au moins une catégorie." };
  }
  if (difficulties.length === 0) {
    return { success: false, error: "Choisis au moins un niveau de difficulté." };
  }

  // 1. Récupère TOUS les mots du catalogue pour les catégories ET difficultés
  // choisies, avec leur statut de cycle actuel (lecture page par page pour
  // contourner le plafond de 1000 lignes par requête).
  const catalogWords = await fetchAllCatalogWords(supabase, categories, difficulties);

  if (catalogWords === null) {
    return { success: false, error: "Impossible de charger le catalogue." };
  }

  // 2. Exclut les mots déjà présents dans la liste de la partie en cours,
  // ET les doublons entre catégories différentes (ex: un mot présent dans
  // deux catégories à la fois) pour ne jamais piocher deux fois le même mot
  // dans une seule partie.
  const { data: existingWords } = await supabase
    .from("words")
    .select("content")
    .eq("game_id", gameId);
  const existingContents = (existingWords ?? []).map((w) => w.content);

  const seenContent = new Set<string>();
  const deduped = catalogWords.filter((w) => {
    const key = w.content.trim().toLowerCase();
    if (seenContent.has(key)) return false;
    seenContent.add(key);
    return true;
  });

  const pool = deduped.filter((w) => !isDuplicateWord(existingContents, w.content));

  // 3. Sépare les mots pas encore utilisés dans le cycle en cours de leur
  // sous-groupe (catégorie+difficulté) des mots déjà utilisés.
  const notUsed = pool.filter((w) => !w.used_in_cycle);
  const alreadyUsed = pool.filter((w) => w.used_in_cycle);

  const selected: CatalogWordRow[] = shuffleArray(notUsed).slice(0, count);
  let startedNewCycle = 0;

  if (selected.length < count) {
    const stillNeeded = count - selected.length;
    const extra = shuffleArray(alreadyUsed).slice(0, stillNeeded);
    startedNewCycle = extra.length;

    // Relance le cycle pour chaque sous-groupe catégorie/difficulté
    // représenté parmi les mots qu'on vient de reprendre : tous ses mots
    // redeviennent disponibles pour la prochaine pioche.
    const bucketsToReset = new Set(extra.map((w) => `${w.category}::${w.difficulty}`));
    await Promise.all(
      [...bucketsToReset].map((bucketKey) => {
        const [category, difficulty] = bucketKey.split("::");
        return supabase
          .from("catalog_words")
          .update({ used_in_cycle: false })
          .eq("category", category)
          .eq("difficulty", difficulty);
      })
    );

    selected.push(...extra);
  }

  if (selected.length === 0) {
    return {
      success: false,
      error: "Aucun mot disponible pour cette combinaison catégories/difficulté.",
    };
  }

  // 4. Ajoute les mots à la liste de la partie.
  const { error: insertWordsError } = await supabase.from("words").insert(
    selected.map((w) => ({
      game_id: gameId,
      content: w.content,
      is_active: true,
      hint: w.hint,
    }))
  );
  if (insertWordsError) {
    return { success: false, error: "Impossible d'ajouter les mots du catalogue." };
  }

  // 5. Marque les mots piochés comme utilisés pour le cycle en cours de
  // leur sous-groupe (y compris ceux dont on vient de relancer le cycle
  // juste au-dessus : ils redeviennent "utilisés" pour ce nouveau cycle).
  const { error: markUsedError } = await supabase
    .from("catalog_words")
    .update({ used_in_cycle: true })
    .in("id", selected.map((w) => w.id));

  if (markUsedError) {
    return {
      success: false,
      error:
        "Les mots ont été ajoutés mais le suivi du cycle a échoué : contacte l'administrateur (règle de sécurité manquante sur catalog_words).",
    };
  }

  return {
    success: true,
    data: { added: selected.length, startedNewCycle },
  };
}
