import { Card } from "@/components/ui/Card";

export function BuzzerDescriberScreen({
  word,
  wordsRemaining,
  totalWords,
  buzzerNickname,
}: {
  word: string;
  wordsRemaining: number;
  totalWords: number;
  buzzerNickname: string | null;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-6 py-6">
      <p className="text-center text-sm font-medium text-ink/50">
        Mot {totalWords - wordsRemaining + 1} sur {totalWords}
      </p>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl2 bg-white p-8 shadow-card">
          <p className="text-center font-display text-4xl font-semibold leading-tight text-ink">
            {word}
          </p>
        </div>
      </div>

      <Card tone={buzzerNickname ? "yellow" : "cream"} className="text-center">
        {buzzerNickname ? (
          <p className="font-display text-lg font-semibold">
            {buzzerNickname} a buzzé !
          </p>
        ) : (
          <p className="text-ink/60">En attente d&apos;un buzz...</p>
        )}
      </Card>
    </div>
  );
}
