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
  onWordFound: (word: WordQueueItem) => Promise<{ success: boolean; roundComplete: boolean }>;
  onTurnEnd: (foundWords: WordQueueItem[], roundComplete: boolean) => void;
}

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
  // Empêche un double-appui rapide sur "Trouvé" d'envoyer deux requêtes pour
  // le même mot (la deuxième échouerait silencieusement côté serveur, mais
  // sans ce verrou la pile locale avançait quand même, sautant le mot suivant
  // sans jamais l'enregistrer réellement en base).
  const isSubmittingRef = useRef(false);

  const currentWord = queue[0];

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
    setQueue((q) => {
      const [first, ...rest] = q;
      return first ? [...rest, first] : q;
    });
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
