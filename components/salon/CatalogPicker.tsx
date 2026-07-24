"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { pickWordsFromCatalog } from "@/app/actions/catalog-actions";
import {
  CATALOG_CATEGORIES,
  CATALOG_CATEGORY_LABELS,
  CATALOG_DIFFICULTIES,
  CATALOG_DIFFICULTY_LABELS,
  CATALOG_WORD_COUNT_OPTIONS,
  CATALOG_REPEAT_EXCLUSION_GAMES,
} from "@/lib/catalog";
import type { CatalogCategory, CatalogDifficulty } from "@/lib/catalog";

export function CatalogPicker({
  gameId,
  hostPlayerId,
}: {
  gameId: string;
  hostPlayerId: string;
}) {
  const [selectedCategories, setSelectedCategories] = useState<CatalogCategory[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<CatalogDifficulty[]>([
    "facile",
  ]);
  const [count, setCount] = useState<number>(20);
  const [feedback, setFeedback] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function toggleCategory(category: CatalogCategory) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category]
    );
  }

  function toggleAllCategories() {
    setSelectedCategories((current) =>
      current.length === CATALOG_CATEGORIES.length ? [] : [...CATALOG_CATEGORIES]
    );
  }

  function toggleDifficulty(difficulty: CatalogDifficulty) {
    setSelectedDifficulties((current) =>
      current.includes(difficulty)
        ? current.filter((d) => d !== difficulty)
        : [...current, difficulty]
    );
  }

  function handlePick() {
    setFeedback(undefined);
    startTransition(async () => {
      const result = await pickWordsFromCatalog(
        gameId,
        hostPlayerId,
        selectedCategories,
        selectedDifficulties,
        count
      );
      if (!result.success) {
        setFeedback(result.error);
        return;
      }
      const { added, reusedOlderWords } = result.data;
      setFeedback(
        `${added} mot${added > 1 ? "s" : ""} pioché${added > 1 ? "s" : ""}` +
          (reusedOlderWords > 0
            ? ` (dont ${reusedOlderWords} déjà vu(s) récemment, faute de stock frais)`
            : "")
      );
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-ink/10 pt-4">
      <div>
        <label className="text-sm font-medium text-ink/70">
          Catalogue partagé
        </label>
        <p className="text-xs text-ink/40">
          Un mot pioché ici ne revient pas avant {CATALOG_REPEAT_EXCLUSION_GAMES}{" "}
          parties.
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink/40">
          Catégories
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleAllCategories}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              selectedCategories.length === CATALOG_CATEGORIES.length
                ? "bg-blue-deep text-cream"
                : "bg-ink/10 text-ink/70"
            }`}
          >
            Tous
          </button>
          {CATALOG_CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  isSelected
                    ? "bg-blue-deep text-cream"
                    : "bg-ink/5 text-ink/60"
                }`}
              >
                {CATALOG_CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink/40">
          Difficulté
        </p>
        <div className="flex flex-wrap gap-2">
          {CATALOG_DIFFICULTIES.map((difficulty) => {
            const isSelected = selectedDifficulties.includes(difficulty);
            return (
              <button
                key={difficulty}
                onClick={() => toggleDifficulty(difficulty)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  isSelected
                    ? "bg-yellow-vivid text-ink"
                    : "bg-ink/5 text-ink/60"
                }`}
              >
                {CATALOG_DIFFICULTY_LABELS[difficulty]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-ink/60">Nombre de mots :</span>
        <div className="flex gap-1.5">
          {CATALOG_WORD_COUNT_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setCount(option)}
              className={`h-8 w-8 rounded-full text-sm font-medium ${
                count === option
                  ? "bg-yellow-vivid text-ink"
                  : "bg-ink/5 text-ink/50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="secondary"
        size="md"
        onClick={handlePick}
        disabled={isPending || selectedCategories.length === 0 || selectedDifficulties.length === 0}
      >
        {isPending ? "Pioche en cours..." : "Piocher des mots"}
      </Button>
      {feedback && <p className="text-sm text-ink/60">{feedback}</p>}
    </div>
  );
}
