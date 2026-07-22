import { Button } from "@/components/ui/Button";
import { TEAM_LABELS } from "@/lib/constants";
import type { Team } from "@/types";

export function TransitionScreen({
  playerNickname,
  team,
  onReady,
}: {
  playerNickname: string;
  team: Team;
  onReady: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-ink/50">C&apos;est au tour de</p>
      <h2 className="font-display text-3xl font-semibold">{playerNickname}</h2>
      <span
        className={`rounded-full px-4 py-1 text-sm font-semibold ${
          team === "blue" ? "bg-blue-pale text-blue-deep" : "bg-yellow-pale text-ink"
        }`}
      >
        {TEAM_LABELS[team]}
      </span>
      <p className="text-ink/60">Passe le téléphone à {playerNickname}.</p>
      <div className="w-full">
        <Button onClick={onReady}>Je suis prêt</Button>
      </div>
    </div>
  );
}
