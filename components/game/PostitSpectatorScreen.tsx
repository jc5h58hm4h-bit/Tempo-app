"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/game/Timer";
import { POSTIT_TURN_DURATION_SECONDS } from "@/types";

export function PostitSpectatorScreen({
  activePlayerNickname,
  word,
  onValidate,
}: {
  activePlayerNickname: string;
  word: string | null;
  onValidate: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleValidate() {
    startTransition(() => {
      onValidate();
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-6 py-6">
      <div className="flex justify-center">
        {/* Purement informatif ici : c'est l'écran du joueur actif qui
            déclenche réellement le passage au joueur suivant en cas
            d'expiration, pour éviter des appels en double. */}
        <Timer durationSeconds={POSTIT_TURN_DURATION_SECONDS} isRunning={true} onExpire={() => {}} />
      </div>

      <p className="text-center text-sm text-ink/50">
        {activePlayerNickname} essaie de deviner son mot
      </p>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl2 bg-white p-8 shadow-card">
          <p className="text-center font-display text-4xl font-semibold leading-tight text-ink">
            {word ?? "…"}
          </p>
        </div>
      </div>

      <Card tone="yellow" className="text-center">
        <p className="text-sm text-ink/70">
          Donne-lui des indices à voix haute (sans jamais dire le mot !).
        </p>
      </Card>

      <div className="sticky bottom-4 pb-safe">
        <Button variant="primary" onClick={handleValidate} disabled={isPending}>
          {activePlayerNickname} a trouvé !
        </Button>
      </div>
    </div>
  );
}
