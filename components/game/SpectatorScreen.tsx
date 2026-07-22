import { ScoreBar } from "@/components/game/ScoreBar";
import { TEAM_LABELS } from "@/lib/constants";
import type { RoundNumber, Team } from "@/types";

export function SpectatorScreen({
  round,
  blueScore,
  yellowScore,
  activePlayerNickname,
  activeTeam,
}: {
  round: RoundNumber;
  blueScore: number;
  yellowScore: number;
  activePlayerNickname: string;
  activeTeam: Team;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-10 text-center">
      <ScoreBar round={round} blueScore={blueScore} yellowScore={yellowScore} />
      <div>
        <p className="text-ink/50">C&apos;est au tour de</p>
        <h2 className="mt-1 font-display text-3xl font-semibold">
          {activePlayerNickname}
        </h2>
        <span
          className={`mt-2 inline-block rounded-full px-4 py-1 text-sm font-semibold ${
            activeTeam === "blue" ? "bg-blue-pale text-blue-deep" : "bg-yellow-pale text-ink"
          }`}
        >
          {TEAM_LABELS[activeTeam]}
        </span>
      </div>
      <p className="text-sm text-ink/40">En attente de la fin de son tour...</p>
    </div>
  );
}
