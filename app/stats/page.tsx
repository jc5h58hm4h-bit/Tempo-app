import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { GameMode } from "@/types";

export const dynamic = "force-dynamic";

interface StatRow {
  nickname: string;
  wordsGuessed: number;
  gamesPlayed: number;
  /** Points par partie jouée, arrondi à 1 décimale : la vraie base du classement. */
  average: number;
}

const MODE_LABELS: Record<GameMode, string> = {
  classic: "Mode Classique",
  chrono: "Mode Chrono",
  buzzer: "Mode Buzzer",
  bombe: "Mode Bombe",
};

function computeAverage(wordsGuessed: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0;
  return Math.round((wordsGuessed / gamesPlayed) * 10) / 10;
}

async function fetchLeaderboard(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  year: number,
  mode: GameMode
): Promise<StatRow[]> {
  const { data } = await supabase
    .from("player_stats")
    .select("nickname, words_guessed, games_played")
    .eq("year", year)
    .eq("mode", mode);

  const rows: StatRow[] = (data ?? []).map((r) => ({
    nickname: r.nickname,
    wordsGuessed: r.words_guessed,
    gamesPlayed: r.games_played,
    average: computeAverage(r.words_guessed, r.games_played),
  }));

  return rows.sort((a, b) => b.average - a.average);
}

/** Classement toutes catégories confondues : cumule les 4 modes par pseudo. */
async function fetchGlobalLeaderboard(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  year: number
): Promise<StatRow[]> {
  const { data } = await supabase
    .from("player_stats")
    .select("nickname, words_guessed, games_played")
    .eq("year", year);

  const byNickname = new Map<string, { nickname: string; wordsGuessed: number; gamesPlayed: number }>();
  for (const row of data ?? []) {
    const existing = byNickname.get(row.nickname);
    if (existing) {
      existing.wordsGuessed += row.words_guessed;
      existing.gamesPlayed += row.games_played;
    } else {
      byNickname.set(row.nickname, {
        nickname: row.nickname,
        wordsGuessed: row.words_guessed,
        gamesPlayed: row.games_played,
      });
    }
  }

  const rows: StatRow[] = [...byNickname.values()].map((r) => ({
    ...r,
    average: computeAverage(r.wordsGuessed, r.gamesPlayed),
  }));

  return rows.sort((a, b) => b.average - a.average);
}

export default async function StatsPage() {
  const supabase = getSupabaseServerClient();
  const year = new Date().getFullYear();

  const [globalRows, classicRows, chronoRows, buzzerRows, bombeRows] = await Promise.all([
    fetchGlobalLeaderboard(supabase, year),
    fetchLeaderboard(supabase, year, "classic"),
    fetchLeaderboard(supabase, year, "chrono"),
    fetchLeaderboard(supabase, year, "buzzer"),
    fetchLeaderboard(supabase, year, "bombe"),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-10 animate-pop-in">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold">Classement {year}</h1>
        <p className="mt-1 text-sm text-ink/60">Moyenne de points par partie jouée</p>
      </div>

      <Leaderboard title="🏆 Classement général (tous modes)" rows={globalRows} highlight />
      <Leaderboard title={MODE_LABELS.classic} rows={classicRows} />
      <Leaderboard title={MODE_LABELS.chrono} rows={chronoRows} />
      <Leaderboard title={MODE_LABELS.buzzer} rows={buzzerRows} />
      <Leaderboard title={MODE_LABELS.bombe} rows={bombeRows} />

      <Link href="/">
        <Button variant="ghost">Retour à l&apos;accueil</Button>
      </Link>
    </main>
  );
}

function Leaderboard({
  title,
  rows,
  highlight = false,
}: {
  title: string;
  rows: StatRow[];
  highlight?: boolean;
}) {
  return (
    <Card className={`flex flex-col gap-2 ${highlight ? "border-2 border-yellow-vivid" : ""}`}>
      <p className="text-sm font-semibold text-ink/70">{title}</p>
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
                {row.average}
                <span className="ml-1 text-xs font-normal text-ink/40">pts/partie</span>
              </p>
              <p className="text-xs text-ink/40">
                {row.wordsGuessed} pts sur {row.gamesPlayed} partie
                {row.gamesPlayed > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
