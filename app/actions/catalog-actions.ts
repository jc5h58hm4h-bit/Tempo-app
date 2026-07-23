"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isDuplicateWord } from "@/lib/game-rules";
import { shuffleArray } from "@/lib/utils";
import { CATALOG_REPEAT_EXCLUSION_GAMES } from "@/lib/catalog";
import type { ActionResult } from "@/lib/action-result";
import type { CatalogCategory } from "@/lib/catalog";

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
  reusedOlderWords: number;
}

/**
 * Pioche des mots aléatoires dans le catalogue partagé, pour les catégories
 * choisies par l'hôte, en excluant en priorité les mots déjà utilisés dans
 * l'une des CATALOG_REPEAT_EXCLUSION_GAMES dernières parties ayant pioché
 * dans le catalogue. Si le nombre de mots "frais" disponibles est
 * insuffisant, complète avec les mots les plus anciennement réutilisés
 * plutôt que d'échouer.
 */
export async function pickWordsFromCatalog(
  gameId: string,
  hostPlayerId: string,
  categories: CatalogCategory[],
  count: number
): Promise<ActionResult<PickResult>> {
  const supabase = getSupabaseServerClient();

  if (!(await assertIsHost(supabase, gameId, hostPlayerId))) {
    return { success: false, error: "Seul l'hôte peut gérer la liste de mots." };
  }
  if (categories.length === 0) {
    return { success: false, error: "Choisis au moins une catégorie." };
  }

  // 1. Détermine les mots à éviter : ceux utilisés dans l'une des N
  // dernières parties ayant elles-mêmes pioché dans le catalogue.
  const { data: recentUsage } = await supabase
    .from("catalog_word_usage")
    .select("word_id, game_id, used_at")
    .order("used_at", { ascending: false })
    .limit(3000);

  const recentGameIds: string[] = [];
  const seenGames = new Set<string>();
  for (const row of recentUsage ?? []) {
    if (!seenGames.has(row.game_id)) {
      seenGames.add(row.game_id);
      recentGameIds.push(row.game_id);
    }
    if (recentGameIds.length >= CATALOG_REPEAT_EXCLUSION_GAMES) break;
  }
  const recentGameIdSet = new Set(recentGameIds);
  const excludedWordIds = new Set(
    (recentUsage ?? [])
      .filter((row) => recentGameIdSet.has(row.game_id))
      .map((row) => row.word_id)
  );

  // 2. Récupère les mots du catalogue pour les catégories choisies.
  const { data: catalogWords, error: catalogError } = await supabase
    .from("catalog_words")
    .select("id, content")
    .in("category", categories);

  if (catalogError) {
    return { success: false, error: "Impossible de charger le catalogue." };
  }

  // 3. Exclut les mots déjà présents dans la liste de la partie en cours.
  const { data: existingWords } = await supabase
    .from("words")
    .select("content")
    .eq("game_id", gameId);
  const existingContents = (existingWords ?? []).map((w) => w.content);

  const pool = (catalogWords ?? []).filter(
    (w) => !isDuplicateWord(existingContents, w.content)
  );
  const freshPool = pool.filter((w) => !excludedWordIds.has(w.id));
  const olderPool = pool.filter((w) => excludedWordIds.has(w.id));

  const selected = shuffleArray(freshPool).slice(0, count);
  let reusedOlderWords = 0;
  if (selected.length < count) {
    const stillNeeded = count - selected.length;
    const extra = shuffleArray(olderPool).slice(0, stillNeeded);
    reusedOlderWords = extra.length;
    selected.push(...extra);
  }

  if (selected.length === 0) {
    return {
      success: false,
      error: "Aucun mot disponible dans ces catégories pour le moment.",
    };
  }

  const { error: insertWordsError } = await supabase.from("words").insert(
    selected.map((w) => ({ game_id: gameId, content: w.content, is_active: true }))
  );
  if (insertWordsError) {
    return { success: false, error: "Impossible d'ajouter les mots du catalogue." };
  }

  await supabase
    .from("catalog_word_usage")
    .insert(selected.map((w) => ({ word_id: w.id, game_id: gameId })));

  return {
    success: true,
    data: { added: selected.length, reusedOlderWords },
  };
}
