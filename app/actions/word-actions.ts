"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isDuplicateWord } from "@/lib/game-rules";
import type { ActionResult } from "@/lib/action-result";
import { GAME_RULES } from "@/types";

/** Vérifie que le joueur est bien l'hôte de la partie avant une action sensible. */
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

function cleanWord(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function isWordValid(word: string): boolean {
  return word.length > 0 && word.length <= GAME_RULES.MAX_WORD_LENGTH;
}

interface AddWordResult {
  id: string;
  content: string;
}

/** Ajoute un mot unique à la liste de la partie. */
export async function addWord(
  gameId: string,
  playerId: string,
  rawContent: string
): Promise<ActionResult<AddWordResult>> {
  const supabase = getSupabaseServerClient();

  if (!(await assertIsHost(supabase, gameId, playerId))) {
    return { success: false, error: "Seul l'hôte peut gérer la liste de mots." };
  }

  const content = cleanWord(rawContent);
  if (!isWordValid(content)) {
    return {
      success: false,
      error: `Le mot doit contenir entre 1 et ${GAME_RULES.MAX_WORD_LENGTH} caractères.`,
    };
  }

  const { data: existingWords } = await supabase
    .from("words")
    .select("content")
    .eq("game_id", gameId);

  if (isDuplicateWord((existingWords ?? []).map((w) => w.content), content)) {
    return { success: false, error: "Ce mot est déjà dans la liste." };
  }

  const { data: word, error } = await supabase
    .from("words")
    .insert({ game_id: gameId, content, is_active: true })
    .select("id, content")
    .single();

  if (error || !word) {
    return { success: false, error: "Impossible d'ajouter ce mot." };
  }
  return { success: true, data: word };
}

/** Supprime un mot de la liste. */
export async function removeWord(
  gameId: string,
  playerId: string,
  wordId: string
): Promise<ActionResult<null>> {
  const supabase = getSupabaseServerClient();

  if (!(await assertIsHost(supabase, gameId, playerId))) {
    return { success: false, error: "Seul l'hôte peut gérer la liste de mots." };
  }

  const { error } = await supabase
    .from("words")
    .delete()
    .eq("id", wordId)
    .eq("game_id", gameId);

  if (error) {
    return { success: false, error: "Impossible de supprimer ce mot." };
  }
  return { success: true, data: null };
}
