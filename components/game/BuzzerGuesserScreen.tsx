"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function BuzzerGuesserScreen({
  describerNickname,
  buzzerNickname,
  isBuzzer,
  onBuzz,
  onResolve,
}: {
  describerNickname: string;
  /** Pseudo de qui a buzzé, ou null si personne n'a encore buzzé. */
  buzzerNickname: string | null;
  /** true si CE joueur est celui qui a buzzé. */
  isBuzzer: boolean;
  onBuzz: () => void;
  onResolve: (correct: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleBuzz() {
    startTransition(() => {
      onBuzz();
    });
  }

  function handleResolve(correct: boolean) {
    startTransition(() => {
      onResolve(correct);
    });
  }

  if (isBuzzer) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-ink/50">Ta réponse était...</p>
        <div className="flex w-full flex-col gap-3">
          <Button variant="primary" onClick={() => handleResolve(true)} disabled={isPending}>
            Bonne réponse (+1 pour toi et {describerNickname})
          </Button>
          <Button variant="secondary" onClick={() => handleResolve(false)} disabled={isPending}>
            Mauvaise réponse
          </Button>
        </div>
      </div>
    );
  }

  if (buzzerNickname) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink/50">{describerNickname} fait deviner</p>
        <Card tone="yellow" className="w-full">
          <p className="font-display text-lg font-semibold">
            {buzzerNickname} a buzzé, en attente de sa réponse...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="text-ink/50">{describerNickname} fait deviner</p>
      <button
        onClick={handleBuzz}
        disabled={isPending}
        className="flex h-48 w-48 items-center justify-center rounded-full bg-yellow-vivid font-display text-3xl font-bold text-ink shadow-card active:translate-y-1 disabled:opacity-60"
      >
        BUZZ
      </button>
    </div>
  );
}
