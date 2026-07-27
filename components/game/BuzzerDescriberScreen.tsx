"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function BuzzerDescriberScreen({
  word,
  wordsRemaining,
  totalWords,
  buzzerNickname,
  onResolve,
  onSkip,
}: {
  word: string;
  wordsRemaining: number;
  totalWords: number;
  buzzerNickname: string | null;
  onResolve: (correct: boolean) => void;
  onSkip: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleResolve(correct: boolean) {
    startTransition(() => {
      onResolve(correct);
    });
  }

  function handleSkip() {
    startTransition(() => {
      onSkip();
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-6 py-6">
      <p className="text-center text-sm font-medium text-ink/50">
        Mot {totalWords - wordsRemaining + 1} sur {totalWords}
      </p>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl2 bg-white p-8 shadow-card">
          <p className="text-center font-display text-4xl font-semibold leading-tight text-ink">
            {word}
          </p>
        </div>
      </div>

      {buzzerNickname ? (
        <div className="flex flex-col gap-3">
          <Card tone="yellow" className="text-center">
            <p className="font-display text-lg font-semibold">
              {buzzerNickname} a buzzé — sa réponse était...
            </p>
          </Card>
          <Button variant="primary" onClick={() => handleResolve(true)} disabled={isPending}>
            Bonne réponse (+1 pour {buzzerNickname} et toi)
          </Button>
          <Button variant="secondary" onClick={() => handleResolve(false)} disabled={isPending}>
            Mauvaise réponse (-1 pour {buzzerNickname})
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Card tone="cream" className="text-center">
            <p className="text-ink/60">En attente d&apos;un buzz...</p>
          </Card>
          <Button variant="ghost" onClick={handleSkip} disabled={isPending}>
            Passer ce mot (-1 pour toi)
          </Button>
        </div>
      )}
    </div>
  );
}
