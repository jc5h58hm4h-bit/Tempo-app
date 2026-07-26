"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/Card";

export function BuzzerGuesserScreen({
  describerNickname,
  buzzerNickname,
  isBuzzer,
  onBuzz,
}: {
  describerNickname: string;
  /** Pseudo de qui a buzzé, ou null si personne n'a encore buzzé. */
  buzzerNickname: string | null;
  /** true si CE joueur est celui qui a buzzé. */
  isBuzzer: boolean;
  onBuzz: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleBuzz() {
    startTransition(() => {
      onBuzz();
    });
  }

  if (isBuzzer) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink/50">Dis ta réponse à voix haute !</p>
        <Card tone="yellow" className="w-full">
          <p className="font-display text-lg font-semibold">
            En attente que {describerNickname} valide ta réponse...
          </p>
        </Card>
      </div>
    );
  }

  if (buzzerNickname) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink/50">{describerNickname} fait deviner</p>
        <Card className="w-full">
          <p className="font-display text-lg font-semibold">
            {buzzerNickname} a buzzé, en attente de la validation...
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
