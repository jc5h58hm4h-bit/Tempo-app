"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { replaySameWords, newGameSamePlayers } from "@/app/actions/round-actions";
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
  const [guessedCounts, setGuessedCounts] = useState<Record<string, number>>({});
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

  // Un mot trouvé est enregistré avec l'identifiant du joueur qui FAISAIT
  // deviner (celui qui tenait le téléphone). Ici on veut au contraire créditer
  // le ou les coéquipiers qui ont DEVINÉ le mot. Dans une équipe de 2, le mot
  // est donc crédité à l'autre membre de l'équipe ; dans une équipe d'1 seul
  // joueur, les deux rôles se confondent et le mot lui reste crédité.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("guessed_words")
      .select("player_id")
      .eq("game_id", gameId)
      .then(({ data }) => {
        const teammateOf: Record<string, string> = {};
        for (const team of ["blue", "yellow"] as const) {
          const members = players.filter((p) => p.team === team);
          const first = members[0];
          const second = members[1];
          if (first && second) {
            teammateOf[first.id] = second.id;
            teammateOf[second.id] = first.id;
          } else if (first) {
            teammateOf[first.id] = first.id;
          }
        }

        const counts: Record<string, number> = {};
        for (const row of data ?? []) {
          const describerId = row.player_id as string;
          const guesserId = teammateOf[describerId] ?? describerId;
          counts[guesserId] = (counts[guesserId] ?? 0) + 1;
        }
        setGuessedCounts(counts);
      });
  }, [gameId, players]);

  const { blue: totalBlue, yellow: totalYellow } = sumRoundScores(
    rounds.map((r) => ({ blueTeamScore: r.blueScore, yellowTeamScore: r.yellowScore }))
  );
  const winner = determineWinningTeam(totalBlue, totalYellow);
  const isTie = winner === "tie";

  const rankedPlayers = [...players].sort(
    (a, b) => (guessedCounts[b.id] ?? 0) - (guessedCounts[a.id] ?? 0)
  );
  const bestPlayer = rankedPlayers[0];
  const bestPlayerCount = bestPlayer ? guessedCounts[bestPlayer.id] ?? 0 : 0;

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

  function handleNewGameSamePlayers() {
    startTransition(async () => {
      const result = await newGameSamePlayers(gameId, hostPlayerId);
      // La redirection vers le salon est automatique : GameRoot détecte le
      // changement de statut de la partie ("lobby") via Realtime.
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

      {bestPlayer && bestPlayerCount > 0 && (
        <Card tone="yellow" className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-ink/60">Meilleur devineur</p>
          <p className="font-display text-xl font-semibold">{bestPlayer.nickname}</p>
          <p className="text-sm text-ink/60">
            {bestPlayerCount} mot{bestPlayerCount > 1 ? "s" : ""} deviné
            {bestPlayerCount > 1 ? "s" : ""}
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-1.5">
        <p className="mb-1 text-sm font-medium text-ink/60">Mots devinés par joueur</p>
        {rankedPlayers.map((player) => (
          <div key={player.id} className="flex justify-between text-sm">
            <span>{player.nickname}</span>
            <span className="font-medium">{guessedCounts[player.id] ?? 0}</span>
          </div>
        ))}
      </Card>

      <div className="flex flex-col gap-2">
        {isHost && (
          <>
            <Button variant="primary" onClick={handleReplay} disabled={isPending}>
              Rejouer avec les mêmes mots
            </Button>
            <Button variant="yellow" onClick={handleNewGameSamePlayers} disabled={isPending}>
              Nouvelle partie (mêmes joueurs)
            </Button>
          </>
        )}
        {!isHost && (
          <p className="text-center text-sm text-ink/40">
            En attente que l&apos;hôte relance une partie...
          </p>
        )}
        <Button variant="secondary" onClick={handleNewGame}>
          Nouvelle partie (nouveau code)
        </Button>
        <Button variant="ghost" onClick={handleHome}>
          Retour à l&apos;accueil
        </Button>
      </div>
    </div>
  );
}
