import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TEAM_LABELS } from "@/lib/constants";
import { determineWinningTeam } from "@/lib/game-rules";
import { ROUND_DEFINITIONS } from "@/types";
import type { RoundNumber } from "@/types";

export function RoundSummary({
  roundNumber,
  blueScore,
  yellowScore,
  isHost,
  onNextRound,
  isPending,
}: {
  roundNumber: RoundNumber;
  blueScore: number;
  yellowScore: number;
  isHost: boolean;
  onNextRound: () => void;
  isPending: boolean;
}) {
  const leader = determineWinningTeam(blueScore, yellowScore);
  const isTie = leader === "tie";
  const nextRoundDef = ROUND_DEFINITIONS[(roundNumber + 1) as RoundNumber];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-10">
      <h2 className="text-center font-display text-2xl font-semibold">
        Fin de la manche {roundNumber}
      </h2>
      <Card className="flex flex-col items-center gap-4">
        <div className="flex w-full gap-3">
          <div className="flex-1 rounded-2xl bg-blue-pale py-4 text-center">
            <p className="text-xs font-medium text-blue-deep/70">{TEAM_LABELS.blue}</p>
            <p className="font-display text-3xl font-semibold text-blue-deep">{blueScore}</p>
          </div>
          <div className="flex-1 rounded-2xl bg-yellow-pale py-4 text-center">
            <p className="text-xs font-medium text-ink/60">{TEAM_LABELS.yellow}</p>
            <p className="font-display text-3xl font-semibold text-ink">{yellowScore}</p>
          </div>
        </div>
        <p className="font-medium text-ink/70">
          {isTie ? "Égalité sur cette manche" : `${TEAM_LABELS[leader]} mène le jeu`}
        </p>
      </Card>

      {isHost ? (
        <Button variant="yellow" onClick={onNextRound} disabled={isPending}>
          Commencer la manche suivante — {nextRoundDef.name}
        </Button>
      ) : (
        <p className="text-center text-sm text-ink/40">
          En attente que l&apos;hôte lance la manche suivante...
        </p>
      )}
    </div>
  );
}
