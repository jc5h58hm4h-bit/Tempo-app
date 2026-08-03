"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Timer } from "@/components/game/Timer";
import { ScoreBar } from "@/components/game/ScoreBar";
import { Button } from "@/components/ui/Button";
import type { GameMode, RoundNumber, Team } from "@/types";

interface WordQueueItem {
  id: string;
  content: string;
}

interface PlayingScreenProps {
  round: RoundNumber;
  team: Team;
  mode: GameMode;
  durationSeconds: number;
  initialQueue: WordQueueItem[];
  blueScore: number;
  yellowScore: number;
  /** Nombre de passes maximum pour ce tour. undefined = illimité (mode classique). */
  maxPasses?: number;
  /** Mode classique uniquement : ce joueur a-t-il déjà utilisé son indice ? */
  hintUsed?: boolean;
  onWordFound: (word: WordQueueItem) => Promise<{ success: boolean; roundComplete: boolean }>;
  onTurnEnd: (foundWords: WordQueueItem[], roundComplete: boolean) => void;
  onUseHint?: () => Promise<{ success: boolean }>;
}

/** Indice auto : 1ère lettre + nombre de lettres (espaces exclus). */
function computeHint(content: string): string {
  const lettersOnly = content.replace(/\s/g, "");
  const count = lettersOnly.length;
  const firstLetter = content.charAt(0).toUpperCase();
  return `Commence par "${firstLetter}" · ${count} lettre${count > 1 ? "s" : ""}`;
}

export function PlayingScreen({
  round,
  team,
  mode,
  durationSeconds,
  initialQueue,
  blueScore,
  yellowScore,
  maxPasses,
  hintUsed,
  onWordFound,
  onTurnEnd,
  onUseHint,
}: PlayingScreenProps) {
  const [queue, setQueue] = useState(initialQueue);
  const foundWordsRef = useRef<WordQueueItem[]>([]);
  const [scores, setScores] = useState({ blue: blueScore, yellow: yellowScore });
  const [isBlocked, setIsBlocked] = useState(false);
  const isBlockedRef = useRef(false);
  const [passesUsed, setPassesUsed] = useState(0);
  const [revealedHint, setRevealedHint] = useState<string | null>(null);
  const [isHintPending, setIsHintPending] = useState(false);
  // Empêche un double-appui rapide sur "Trouvé" d'envoyer deux requêtes pour
  // le même mot (la deuxième échouerait silencieusement côté serveur, mais
  // sans ce verrou la pile locale avançait quand même, sautant le mot suivant
  // sans jamais l'enregistrer réellement en base).
  const isSubmittingRef = useRef(false);

  const currentWord = queue[0];
  const passLimitReached = maxPasses !== undefined && passesUsed >= maxPasses;
  const canShowHintButton = mode === "classic" && !!onUseHint && !hintUsed && !revealedHint;

  // Un indice révélé ne vaut que pour le mot affiché au moment où on l'a
  // demandé : dès que le mot change (trouvé, passé...), on le masque.
  useEffect(() => {
    setRevealedHint(null);
  }, [currentWord?.id]);

  const handleExpire = useCallback(() => {
    isBlockedRef.current = true;
    setIsBlocked(true);
    onTurnEnd(foundWordsRef.current, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFound() {
    if (!currentWord || isBlockedRef.current || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      const wordToSubmit = currentWord;
      const result = await onWordFound(wordToSubmit);
      if (!result.success) {
        // Échec réel (réseau, ou tentative en double déjà enregistrée) :
        // on ne touche pas à la pile, l'utilisateur peut retenter "Trouvé".
        return;
      }
      setQueue((q) => q.slice(1));
      foundWordsRef.current = [...foundWordsRef.current, wordToSubmit];
      setScores((s) => ({
        ...s,
        [team]: s[team] + 1,
      }));
      if (result.roundComplete) {
        isBlockedRef.current = true;
        setIsBlocked(true);
        onTurnEnd(foundWordsRef.current, true);
      }
    } finally {
      isSubmittingRef.current = false;
    }
  }

  function handlePass() {
    if (!currentWord || isBlockedRef.current || queue.length <= 1) return;
    if (passLimitReached) return;
    setQueue((q) => {
      const [first, ...rest] = q;
      return first ? [...rest, first] : q;
    });
    setPassesUsed((p) => p + 1);
  }

  async function handleUseHint() {
    if (!currentWord || !onUseHint || hintUsed || isHintPending) return;
    setIsHintPending(true);
    try {
      const result = await onUseHint();
      if (result.success) {
        setRevealedHint(computeHint(currentWord.content));
      }
    } finally {
      setIsHintPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-6 py-6">
      <ScoreBar round={round} blueScore={scores.blue} yellowScore={scores.yellow} mode={mode} />

      <div className="flex justify-center">
        <Timer durationSeconds={durationSeconds} isRunning={!isBlocked} onExpire={handleExpire} />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl2 bg-white p-8 shadow-card">
          <p className="text-center font-display text-4xl font-semibold leading-tight text-ink">
            {currentWord?.content ?? "…"}
          </p>
        </div>
      </div>

      {maxPasses !== undefined && (
        <p className="text-center text-xs text-ink/40">
          Passes restantes : {Math.max(0, maxPasses - passesUsed)} / {maxPasses}
        </p>
      )}

      {mode === "classic" && !!onUseHint && (
        <div className="flex flex-col items-center gap-1">
          {revealedHint ? (
            <p className="rounded-full bg-yellow-pale px-4 py-1.5 text-sm font-medium text-ink">
              💡 {revealedHint}
            </p>
          ) : canShowHintButton ? (
            <button
              onClick={handleUseHint}
              disabled={isBlocked || !currentWord || isHintPending}
              className="rounded-full bg-ink/5 px-4 py-1.5 text-sm font-medium text-ink/70 disabled:opacity-40"
            >
              💡 Utiliser mon indice (1 pour toute la partie)
            </button>
          ) : (
            <p className="text-xs text-ink/30">💡 Indice déjà utilisé</p>
          )}
        </div>
      )}

      <div className="sticky bottom-4 flex gap-3 pb-safe">
        <Button
          variant="secondary"
          onClick={handlePass}
          disabled={isBlocked || queue.length <= 1 || passLimitReached}
        >
          Passer
        </Button>
        <Button variant="primary" onClick={handleFound} disabled={isBlocked || !currentWord}>
          Trouvé
        </Button>
      </div>
    </div>
  );
}
