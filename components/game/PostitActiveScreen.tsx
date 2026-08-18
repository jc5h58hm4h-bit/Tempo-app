"use client";

import { Card } from "@/components/ui/Card";
import { Timer } from "@/components/game/Timer";
import { POSTIT_TURN_DURATION_SECONDS } from "@/types";

export function PostitActiveScreen({ onExpire }: { onExpire: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex justify-center">
        <Timer
          durationSeconds={POSTIT_TURN_DURATION_SECONDS}
          isRunning={true}
          onExpire={onExpire}
        />
      </div>

      <Card className="flex flex-col items-center gap-2">
        <p className="text-4xl">🤔</p>
        <p className="font-display text-xl font-semibold">C&apos;est ton tour !</p>
        <p className="text-sm text-ink/60">
          Les autres joueurs voient ton mot sur leur écran et vont te donner des
          indices à voix haute. Devine-le avant la fin du chrono !
        </p>
      </Card>
    </div>
  );
}
