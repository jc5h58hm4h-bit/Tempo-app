import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

interface StatRow {
  nickname: string;
  wordsGuessed: number;
  gamesPlayed: number;
}

export default async function StatsPage() {
  const supabase = getSupabaseServerClient();
  const year = new Date().getFullYear();

  const { data } = await supabase
    .from("player_stats")
    .select("nickname, words_guessed, games_played")
    .eq("year", year)
    .order("words_guessed", { ascending: false });

  const rows: StatRow[] = (data ?? []).map((r) => ({
    nickname: r.nickname,
    wordsGuessed: r.words_guessed,
    gamesPlayed: r.games_played,
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-10 animate-pop-in">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold">Classement {year}</h1>
        <p className="mt-1 text-sm text-ink/60">Mots devinés cumulés sur l&apos;année</p>
      </div>

      <Card className="flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="py-4 text-center text-sm text-ink/40">
            Aucune partie terminée pour l&apos;instant cette année.
          </p>
        )}
        {rows.map((row, index) => {
          const isTop = index === 0;
          const isLast = index === rows.length - 1 && rows.length > 1;
          return (
            <div
              key={row.nickname}
              className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 text-sm font-medium text-ink/40">{index + 1}</span>
                <span className="font-medium text-ink">{row.nickname}</span>
                {isTop && (
                  <span className="rounded-full bg-yellow-vivid px-2 py-0.5 text-xs font-semibold text-ink">
                    🏆 Au top
                  </span>
                )}
                {isLast && (
                  <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink/60">
                    🙈 Looser
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-semibold text-blue-deep">
                  {row.wordsGuessed}
                </p>
                <p className="text-xs text-ink/40">
                  {row.gamesPlayed} partie{row.gamesPlayed > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </Card>

      <Link href="/">
        <Button variant="ghost">Retour à l&apos;accueil</Button>
      </Link>
    </main>
  );
}
