import { TEAM_LABELS } from "@/lib/constants";
import { ROUND_DEFINITIONS } from "@/types";
import type { RoundNumber } from "@/types";

export function ScoreBar({
  round,
  blueScore,
  yellowScore,
}: {
  round: RoundNumber;
  blueScore: number;
  yellowScore: number;
}) {
  const roundDef = ROUND_DEFINITIONS[round];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-sm font-medium text-ink/50">
        Manche {roundDef.number} sur 2 · {roundDef.name}
      </p>
      <div className="flex gap-2">
        <div className="flex-1 rounded-2xl bg-blue-pale px-3 py-2 text-center">
          <p className="text-xs font-medium text-blue-deep/70">{TEAM_LABELS.blue}</p>
          <p className="font-display text-xl font-semibold text-blue-deep">{blueScore}</p>
        </div>
        <div className="flex-1 rounded-2xl bg-yellow-pale px-3 py-2 text-center">
          <p className="text-xs font-medium text-ink/60">{TEAM_LABELS.yellow}</p>
          <p className="font-display text-xl font-semibold text-ink">{yellowScore}</p>
        </div>
      </div>
    </div>
  );
}
