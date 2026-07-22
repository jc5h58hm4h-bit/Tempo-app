import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function TurnSummary({
  foundWords,
  onContinue,
  isPending,
}: {
  foundWords: string[];
  onContinue: () => void;
  isPending: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-10">
      <h2 className="text-center font-display text-2xl font-semibold">Temps écoulé !</h2>
      <Card className="flex flex-col gap-2">
        <p className="text-center text-ink/60">
          {foundWords.length} mot{foundWords.length > 1 ? "s" : ""} trouvé
          {foundWords.length > 1 ? "s" : ""}
        </p>
        {foundWords.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-2">
            {foundWords.map((word, i) => (
              <li
                key={i}
                className="rounded-full bg-blue-pale px-3 py-1 text-sm text-blue-deep"
              >
                {word}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Button onClick={onContinue} disabled={isPending}>
        Joueur suivant
      </Button>
    </div>
  );
}
