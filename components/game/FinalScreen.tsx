"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { replaySameWords } from "@/app/actions/round-actions";
import { clearPlayerSession } from "@/lib/session";
import { TEAM_LABELS } from "@/lib/constants";
import { sumRoundScores, determineWinningTeam } from "@/lib/game-rules";
import type { Player } from "@/types";

interface RoundResult {
  roundNumber: number;
  name: string;
  blueScore: number;
  yellowScore: number;
}

export function FinalScreen({
  gameId,
  gameCode,
  hostPlayerId,
  isHost,
  players,
}: {
  gameId: string;
  gameCode: string;
  hostPlayerId: string;
  isHost: boolean;
  players: Player[];
}) {
  const router = useRouter();
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("rounds")
      .select("round_number, blue_team_score, yellow_team_score")
      .eq("game_id", gameId)
      .order("round_number")
      .then(({ data }) => {
        setRounds(
          (data ?? []).map((r) => ({
            roundNumber: r.round_number,
            name: r.round_number === 1 ? "Description libre" : "Un seul mot",
            blueScore: r.blue_team_score,
            yellowScore: r.yellow_team_score,
          }))
        );
      });
  }, [gameId]);

  const { blue: totalBlue, yellow: totalYellow } = sumRoundScores(
    rounds.map((r) => ({ blueTeamScore: r.blueScore, yellowTeamScore: r.yellowScore }))
  );
  const winner = determineWinningTeam(totalBlue, totalYellow);
  const isTie = winner === "tie";

  const bestPlayer = [...players].sort((a, b) => b.score - a.score)[0];

  function handleReplay() {
    startTransition(async () => {
      const result = await replaySameWords(gameId, hostPlayerId);
      // La redirection est automatique : GameRoot détecte le changement de
      // statut de la partie ("in_progress") via Realtime et affiche la manche 1.
      if (!result.success) {
        // eslint-disable-next-line no-console
        console.error(result.error);
      }
    });
  }

  function handleNewGame() {
    clearPlayerSession(gameCode);
    router.push("/");
  }

  function handleHome() {
    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-10 animate-pop-in">
      <div className="text-center">
        <p className="text-4xl">🏆</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">
          {isTie ? "Match nul !" : `${TEAM_LABELS[winner]} gagne !`}
        </h2>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl bg-blue-pale py-4 text-center">
            <p className="text-xs font-medium text-blue-deep/70">{TEAM_LABELS.blue}</p>
            <p className="font-display text-3xl font-semibold text-blue-deep">{totalBlue}</p>
          </div>
          <div className="flex-1 rounded-2xl bg-yellow-pale py-4 text-center">
            <p className="text-xs font-medium text-ink/60">{TEAM_LABELS.yellow}</p>
            <p className="font-display text-3xl font-semibold text-ink">{totalYellow}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-ink/10 pt-3 text-sm">
          {rounds.map((r) => (
            <div key={r.roundNumber} className="flex justify-between text-ink/60">
              <span>
                Manche {r.roundNumber} — {r.name}
              </span>
              <span>
                {r.blueScore} – {r.yellowScore}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {bestPlayer && (
        <Card tone="yellow" className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-ink/60">Meilleur joueur</p>
          <p className="font-display text-xl font-semibold">{bestPlayer.nickname}</p>
          <p className="text-sm text-ink/60">
            {bestPlayer.score} mot{bestPlayer.score > 1 ? "s" : ""} trouvé
            {bestPlayer.score > 1 ? "s" : ""}
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-1.5">
        <p className="mb-1 text-sm font-medium text-ink/60">Mots trouvés par joueur</p>
        {[...players]
          .sort((a, b) => b.score - a.score)
          .map((player) => (
            <div key={player.id} className="flex justify-between text-sm">
              <span>{player.nickname}</span>
              <span className="font-medium">{player.score}</span>
            </div>
          ))}
      </Card>

      <div className="flex flex-col gap-2">
        {isHost && (
          <Button variant="primary" onClick={handleReplay} disabled={isPending}>
            Rejouer avec les mêmes mots
          </Button>
        )}
        <Button variant="secondary" onClick={handleNewGame}>
          Nouvelle partie
        </Button>
        <Button variant="ghost" onClick={handleHome}>
          Retour à l&apos;accueil
        </Button>
      </div>
    </div>
  );
}
