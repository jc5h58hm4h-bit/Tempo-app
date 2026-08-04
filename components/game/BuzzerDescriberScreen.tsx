"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/game/Timer";

/** Temps laissé pour buzzer sur un mot avant qu'il ne soit automatiquement passé. */
const BUZZER_WORD_TIMER_SECONDS = 20;

export function BuzzerDescriberScreen({
  word,
  hint,
  wordsRemaining,
  totalWords,
  buzzerNickname,
  hintUsed,
  onResolve,
  onSkip,
  onUseHint,
}: {
  word: string;
  /** Indice de sens écrit à l'avance (catalogue uniquement), null si absent. */
  hint: string | null;
  wordsRemaining: number;
  totalWords: number;
  buzzerNickname: string | null;
  /** A-t-il déjà utilisé son indice (1 par partie, tous modes confondus) ? */
  hintUsed?: boolean;
  onResolve: (correct: boolean) => void;
  onSkip: () => void;
  onUseHint?: () => Promise<{ success: boolean }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [revealedHint, setRevealedHint] = useState<string | null>(null);
  const [isHintPending, setIsHintPending] = useState(false);

  // Un indice révélé, et le fait d'avoir déjà agi sur ce mot, ne valent que
  // pour le mot affiché : dès que le mot change (résolu, passé, temps
  // écoulé...), tout se réinitialise pour le suivant.
  useEffect(() => {
    setRevealedHint(null);
  }, [word]);

  const canShowHintButton = !!onUseHint && !hintUsed && !revealedHint && !!hint;

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

  function handleTimerExpire() {
    // Le temps est écoulé sans qu'aucun buzz n'ait eu lieu : exactement
    // comme un "Passer" manuel (le mot est perdu, -1 point).
    if (isPending || buzzerNickname) return;
    handleSkip();
  }

  async function handleUseHint() {
    if (!hint || !onUseHint || hintUsed || isHintPending) return;
    setIsHintPending(true);
    try {
      const result = await onUseHint();
      if (result.success) {
        setRevealedHint(hint);
      }
    } finally {
      setIsHintPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-6 py-6">
      <p className="text-center text-sm font-medium text-ink/50">
        Mot {totalWords - wordsRemaining + 1} sur {totalWords}
      </p>

      {!buzzerNickname && (
        <div className="flex justify-center">
          <Timer
            key={word}
            durationSeconds={BUZZER_WORD_TIMER_SECONDS}
            isRunning={!isPending}
            onExpire={handleTimerExpire}
          />
        </div>
      )}

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

          {hint && (
            <div className="flex flex-col items-center gap-1">
              {revealedHint ? (
                <p className="rounded-full bg-yellow-pale px-4 py-1.5 text-sm font-medium text-ink">
                  💡 {revealedHint}
                </p>
              ) : canShowHintButton ? (
                <button
                  onClick={handleUseHint}
                  disabled={isHintPending}
                  className="rounded-full bg-ink/5 px-4 py-1.5 text-sm font-medium text-ink/70 disabled:opacity-40"
                >
                  💡 Utiliser mon indice (1 pour toute la partie)
                </button>
              ) : (
                <p className="text-xs text-ink/30">💡 Indice déjà utilisé</p>
              )}
            </div>
          )}

          <Button variant="secondary" onClick={handleSkip} disabled={isPending}>
            Passer ce mot (-1 pour toi)
          </Button>
        </div>
      )}
    </div>
  );
}
