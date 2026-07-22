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

interface ImportWordsResult {
  added: number;
  skippedDuplicates: number;
  skippedInvalid: number;
}

/** Importe plusieurs mots collés en une seule fois (un mot par ligne). */
export async function addWordsBulk(
  gameId: string,
  playerId: string,
  rawText: string
): Promise<ActionResult<ImportWordsResult>> {
  const supabase = getSupabaseServerClient();

  if (!(await assertIsHost(supabase, gameId, playerId))) {
    return { success: false, error: "Seul l'hôte peut gérer la liste de mots." };
  }

  const { data: existingWords } = await supabase
    .from("words")
    .select("content")
    .eq("game_id", gameId);

  const existingLower = new Set(
    (existingWords ?? []).map((w) => w.content.toLowerCase())
  );

  const lines = rawText.split("\n").map(cleanWord);

  let skippedInvalid = 0;
  let skippedDuplicates = 0;
  const toInsert: { game_id: string; content: string; is_active: true }[] = [];
  const seenInBatch = new Set<string>();

  for (const line of lines) {
    if (!isWordValid(line)) {
      if (line.length > 0) skippedInvalid++;
      continue;
    }
    const key = line.toLowerCase();
    if (existingLower.has(key) || seenInBatch.has(key)) {
      skippedDuplicates++;
      continue;
    }
    seenInBatch.add(key);
    toInsert.push({ game_id: gameId, content: line, is_active: true });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("words").insert(toInsert);
    if (error) {
      return { success: false, error: "Impossible d'importer les mots." };
    }
  }

  return {
    success: true,
    data: {
      added: toInsert.length,
      skippedDuplicates,
      skippedInvalid,
    },
  };
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

/**
 * Point d'entrée prévu pour l'import de fichier .txt / .csv.
 * Non branché à une interface dans cette version : l'architecture est prête
 * (mêmes règles de validation que addWordsBulk) pour qu'un futur composant
 * d'upload de fichier n'ait qu'à lire le fichier en texte et appeler
 * addWordsBulk avec son contenu.
 */
export async function addWordsFromFileContent(
  gameId: string,
  playerId: string,
  fileText: string
): Promise<ActionResult<ImportWordsResult>> {
  return addWordsBulk(gameId, playerId, fileText);
}
