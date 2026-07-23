"use client";

import { useRef, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { addWord, addWordsBulk, removeWord, addWordsFromFileContent } from "@/app/actions/word-actions";
import { DEMO_WORDS } from "@/lib/demo-words";
<<<<<<< main
import { CatalogPicker } from "@/components/salon/CatalogPicker";
=======
>>>>>>> origin/main
import type { Word } from "@/types";
import { GAME_RULES } from "@/types";

interface WordManagerProps {
  gameId: string;
  hostPlayerId: string;
  isHost: boolean;
  words: Word[];
}

export function WordManager({ gameId, hostPlayerId, isHost, words }: WordManagerProps) {
  if (!isHost) {
    return (
      <Card className="flex flex-col items-center gap-1 text-center">
        <h3 className="font-display text-lg font-semibold">Liste de mots</h3>
        <p className="text-sm text-ink/60">
          {words.length > 0
            ? `${words.length} mot${words.length > 1 ? "s" : ""} ajouté${words.length > 1 ? "s" : ""} par l'hôte.`
            : "En attente que l'hôte ajoute des mots..."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Liste de mots</h3>
        <span className="rounded-full bg-ink/5 px-3 py-1 text-sm font-medium text-ink/60">
          {words.length} mot{words.length > 1 ? "s" : ""}
        </span>
      </div>

      <CatalogPicker gameId={gameId} hostPlayerId={hostPlayerId} />
      <SingleWordForm gameId={gameId} hostPlayerId={hostPlayerId} />
      <BulkWordForm gameId={gameId} hostPlayerId={hostPlayerId} />
      <FileImportForm gameId={gameId} hostPlayerId={hostPlayerId} />
      <WordCatalog gameId={gameId} hostPlayerId={hostPlayerId} />

      {words.length > 0 && (
        <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {words.map((word) => (
            <li
              key={word.id}
              className="flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-sm"
            >
              <span>{word.content}</span>
              <RemoveWordButton
                gameId={gameId}
                hostPlayerId={hostPlayerId}
                wordId={word.id}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SingleWordForm({
  gameId,
  hostPlayerId,
}: {
  gameId: string;
  hostPlayerId: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setError(undefined);
    startTransition(async () => {
      const result = await addWord(gameId, hostPlayerId, value);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setValue("");
    });
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Input
          id="single-word"
          placeholder="Ajouter un mot"
          value={value}
          maxLength={GAME_RULES.MAX_WORD_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          error={error}
        />
      </div>
      <Button
        variant="secondary"
        size="md"
        className="w-auto shrink-0"
        onClick={handleAdd}
        disabled={isPending || value.trim().length === 0}
      >
        Ajouter
      </Button>
    </div>
  );
}

function BulkWordForm({
  gameId,
  hostPlayerId,
}: {
  gameId: string;
  hostPlayerId: string;
}) {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleImport() {
    setFeedback(undefined);
    startTransition(async () => {
      const result = await addWordsBulk(gameId, hostPlayerId, value);
      if (!result.success) {
        setFeedback(result.error);
        return;
      }
      const { added, skippedDuplicates, skippedInvalid } = result.data;
      setFeedback(
        `${added} mot${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""}` +
          (skippedDuplicates > 0 ? ` · ${skippedDuplicates} doublon(s) ignoré(s)` : "") +
          (skippedInvalid > 0 ? ` · ${skippedInvalid} invalide(s) ignoré(s)` : "")
      );
      setValue("");
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-ink/10 pt-4">
      <label htmlFor="bulk-words" className="text-sm font-medium text-ink/70">
        Coller plusieurs mots (un par ligne)
      </label>
      <textarea
        id="bulk-words"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder={"Bruce Springsteen\nTour Eiffel\nPizza"}
        className="w-full rounded-2xl border-2 border-ink/10 bg-white p-3 text-sm text-ink placeholder:text-ink/30 focus:border-blue-DEFAULT focus:outline-none"
      />
      <Button
        variant="secondary"
        size="md"
        onClick={handleImport}
        disabled={isPending || value.trim().length === 0}
      >
        Importer les mots
      </Button>
      {feedback && <p className="text-sm text-ink/60">{feedback}</p>}
    </div>
  );
}

function FileImportForm({
  gameId,
  hostPlayerId,
}: {
  gameId: string;
  hostPlayerId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setFeedback(undefined);
      startTransition(async () => {
        const result = await addWordsFromFileContent(gameId, hostPlayerId, text);
        if (!result.success) {
          setFeedback(result.error);
          return;
        }
        const { added, skippedDuplicates, skippedInvalid } = result.data;
        setFeedback(
          `${added} mot${added > 1 ? "s" : ""} importé${added > 1 ? "s" : ""} depuis le fichier` +
            (skippedDuplicates > 0 ? ` · ${skippedDuplicates} doublon(s) ignoré(s)` : "") +
            (skippedInvalid > 0 ? ` · ${skippedInvalid} invalide(s) ignoré(s)` : "")
        );
      });
    };
    reader.readAsText(file);
    // Permet de resélectionner le même fichier une seconde fois si besoin.
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-2 border-t border-ink/10 pt-4">
      <label className="text-sm font-medium text-ink/70">
        Importer un fichier .txt ou .csv (un mot par ligne)
      </label>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv,text/plain,text/csv"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="secondary"
        size="md"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
      >
        {isPending ? "Import en cours..." : "Choisir un fichier"}
      </Button>
      {feedback && <p className="text-sm text-ink/60">{feedback}</p>}
    </div>
  );
}

function WordCatalog({
  gameId,
  hostPlayerId,
}: {
  gameId: string;
  hostPlayerId: string;
}) {
  const [feedback, setFeedback] = useState<string | undefined>();
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleImportCategory(category: string, categoryWords: string[]) {
    setFeedback(undefined);
    setPendingCategory(category);
    startTransition(async () => {
      const result = await addWordsBulk(gameId, hostPlayerId, categoryWords.join("\n"));
      if (!result.success) {
        setFeedback(result.error);
        return;
      }
      const { added, skippedDuplicates } = result.data;
      setFeedback(
        `${added} mot${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} depuis "${category}"` +
          (skippedDuplicates > 0 ? ` · ${skippedDuplicates} déjà présent(s)` : "")
      );
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-ink/10 pt-4">
      <label className="text-sm font-medium text-ink/70">
        Catalogue de mots prêts à l&apos;emploi
      </label>
      <div className="flex flex-wrap gap-2">
        {DEMO_WORDS.map(({ category, words: categoryWords }) => (
          <button
            key={category}
            onClick={() => handleImportCategory(category, categoryWords)}
            disabled={isPending}
            className="rounded-full bg-yellow-pale px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-40"
          >
            {isPending && pendingCategory === category ? "..." : category}
            <span className="ml-1 text-ink/40">({categoryWords.length})</span>
          </button>
        ))}
      </div>
      {feedback && <p className="text-sm text-ink/60">{feedback}</p>}
    </div>
  );
}

function RemoveWordButton({
  gameId,
  hostPlayerId,
  wordId,
}: {
  gameId: string;
  hostPlayerId: string;
  wordId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      await removeWord(gameId, hostPlayerId, wordId);
    });
  }

  return (
    <button
      aria-label="Supprimer le mot"
      disabled={isPending}
      onClick={handleRemove}
      className="ml-2 text-ink/40 hover:text-red-600 disabled:opacity-40"
    >
      ✕
    </button>
  );
}
