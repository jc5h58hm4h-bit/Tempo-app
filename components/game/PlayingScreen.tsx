"use client";

import { useCallback, useRef, useState } from "react";
import { Timer } from "@/components/game/Timer";
import { ScoreBar } from "@/components/game/ScoreBar";
import { Button } from "@/components/ui/Button";
import type { RoundNumber, Team } from "@/types";

interface WordQueueItem {
  id: string;
  content: string;
}

interface PlayingScreenProps {
  round: RoundNumber;
  team: Team;
  durationSeconds: number;
  initialQueue: WordQueueItem[];
  blueScore: number;
  yellowScore: number;
  onWordFound: (word: WordQueueItem) => Promise<{ roundComplete: boolean }>;
  onTurnEnd: (foundWords: WordQueueItem[], roundComplete: boolean) => void;
}

/**
 * Gère la pile de mots localement pour le joueur actif uniquement :
 * "Trouvé" retire le mot et écrit en base ; "Passer" le replace en fin de
 * pile sans écriture (comportement décrit section 8 du cahier des charges).
 */
export function PlayingScreen({
  round,
  team,
  durationSeconds,
  initialQueue,
  blueScore,
  yellowScore,
  onWordFound,
  onTurnEnd,
}: PlayingScreenProps) {
  const [queue, setQueue] = useState(initialQueue);
  const foundWordsRef = useRef<WordQueueItem[]>([]);
  const [scores, setScores] = useState({ blue: blueScore, yellow: yellowScore });
  const [isBlocked, setIsBlocked] = useState(false);
  const isBlockedRef = useRef(false);

  const currentWord = queue[0];

  const handleExpire = useCallback(() => {
    isBlockedRef.current = true;
    setIsBlocked(true);
    onTurnEnd(foundWordsRef.current, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFound() {
    if (!currentWord || isBlockedRef.current) return;
    const result = await onWordFound(currentWord);
    setQueue((q) => q.slice(1));
    foundWordsRef.current = [...foundWordsRef.current, currentWord];
    setScores((s) => ({
      ...s,
      [team]: s[team] + 1,
    }));
    if (result.roundComplete) {
      isBlockedRef.current = true;
      setIsBlocked(true);
      onTurnEnd(foundWordsRef.current, true);
    }
  }

  function handlePass() {
    if (!currentWord || isBlockedRef.current || queue.length <= 1) return;
    setQueue((q) => [...q.slice(1), q[0]]);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-6 py-6">
      <ScoreBar round={round} blueScore={scores.blue} yellowScore={scores.yellow} />

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

      <div className="sticky bottom-4 flex gap-3 pb-safe">
        <Button variant="secondary" onClick={handlePass} disabled={isBlocked || queue.length <= 1}>
          Passer
        </Button>
        <Button variant="primary" onClick={handleFound} disabled={isBlocked || !currentWord}>
          Trouvé
        </Button>
      </div>
    </div>
  );
}
