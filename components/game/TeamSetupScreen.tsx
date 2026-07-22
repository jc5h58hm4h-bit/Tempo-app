"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { assignTeamsAuto, assignTeamsManual, startGameRounds } from "@/app/actions/round-actions";
import { TEAM_LABELS } from "@/lib/constants";
import type { Player, Team } from "@/types";

interface TeamSetupScreenProps {
  gameId: string;
  hostPlayerId: string;
  isHost: boolean;
  players: Player[];
}

export function TeamSetupScreen({ gameId, hostPlayerId, isHost, players }: TeamSetupScreenProps) {
  const [mode, setMode] = useState<"choice" | "manual">("choice");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const teamsAssigned = players.length > 0 && players.every((p) => p.team !== null);

  function handleAuto() {
    setError(undefined);
    startTransition(async () => {
      const result = await assignTeamsAuto(gameId, hostPlayerId);
      if (!result.success) setError(result.error);
    });
  }

  function handleStart() {
    setError(undefined);
    startTransition(async () => {
      const result = await startGameRounds(gameId, hostPlayerId);
      if (!result.success) setError(result.error);
    });
  }

  if (!isHost) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="font-display text-2xl font-semibold">Constitution des équipes</h2>
        <p className="text-ink/60">L&apos;hôte prépare les équipes...</p>
        <TeamLists players={players} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-10">
      <h2 className="text-center font-display text-2xl font-semibold">
        Constitution des équipes
      </h2>

      {mode === "choice" && !teamsAssigned && (
        <div className="flex flex-col gap-3">
          <Button onClick={handleAuto} disabled={isPending}>
            Créer les équipes automatiquement
          </Button>
          <Button variant="secondary" onClick={() => setMode("manual")}>
            Choisir les équipes manuellement
          </Button>
        </div>
      )}

      {mode === "manual" && !teamsAssigned && (
        <ManualTeamPicker
          gameId={gameId}
          hostPlayerId={hostPlayerId}
          players={players}
          onCancel={() => setMode("choice")}
        />
      )}

      {teamsAssigned && (
        <>
          <TeamLists players={players} />
          <Button variant="yellow" onClick={handleStart} disabled={isPending}>
            Commencer la partie
          </Button>
        </>
      )}

      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TeamLists({ players }: { players: Player[] }) {
  const blue = players.filter((p) => p.team === "blue");
  const yellow = players.filter((p) => p.team === "yellow");

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card tone="blue">
        <p className="mb-2 font-display font-semibold text-blue-deep">
          {TEAM_LABELS.blue}
        </p>
        <ul className="flex flex-col gap-1 text-sm text-blue-deep/80">
          {blue.map((p) => (
            <li key={p.id}>{p.nickname}</li>
          ))}
          {blue.length === 0 && <li className="text-blue-deep/40">—</li>}
        </ul>
      </Card>
      <Card tone="yellow">
        <p className="mb-2 font-display font-semibold text-ink">{TEAM_LABELS.yellow}</p>
        <ul className="flex flex-col gap-1 text-sm text-ink/80">
          {yellow.map((p) => (
            <li key={p.id}>{p.nickname}</li>
          ))}
          {yellow.length === 0 && <li className="text-ink/40">—</li>}
        </ul>
      </Card>
    </div>
  );
}

function ManualTeamPicker({
  gameId,
  hostPlayerId,
  players,
  onCancel,
}: {
  gameId: string;
  hostPlayerId: string;
  players: Player[];
  onCancel: () => void;
}) {
  const [assignments, setAssignments] = useState<Record<string, Team>>(() =>
    Object.fromEntries(players.map((p, i) => [p.id, i % 2 === 0 ? "blue" : "yellow"]))
  );
  const [isPending, startTransition] = useTransition();

  function toggle(playerId: string) {
    setAssignments((current) => ({
      ...current,
      [playerId]: current[playerId] === "blue" ? "yellow" : "blue",
    }));
  }

  function handleConfirm() {
    startTransition(async () => {
      await assignTeamsManual(
        gameId,
        hostPlayerId,
        players.map((p) => ({ playerId: p.id, team: assignments[p.id] }))
      );
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-ink/60">
        Touche un joueur pour changer son équipe.
      </p>
      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const team = assignments[player.id];
          return (
            <li key={player.id}>
              <button
                onClick={() => toggle(player.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-medium ${
                  team === "blue"
                    ? "bg-blue-pale text-blue-deep"
                    : "bg-yellow-pale text-ink"
                }`}
              >
                <span>{player.nickname}</span>
                <span>{TEAM_LABELS[team]}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <Button variant="secondary" size="md" onClick={onCancel}>
          Annuler
        </Button>
        <Button size="md" onClick={handleConfirm} disabled={isPending}>
          Valider
        </Button>
      </div>
    </Card>
  );
}
