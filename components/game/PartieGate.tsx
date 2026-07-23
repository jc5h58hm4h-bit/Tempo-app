"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayerSession, savePlayerSession } from "@/lib/session";
import { GameRoot } from "@/components/game/GameRoot";
import { Button } from "@/components/ui/Button";
import type { Game, Player, Round, Word } from "@/types";

interface PartieGateProps {
  code: string;
  initialGame: Game;
  initialPlayers: Player[];
  initialWords: Word[];
  initialRounds: Round[];
}

export function PartieGate({
  code,
  initialGame,
  initialPlayers,
  initialWords,
  initialRounds,
}: PartieGateProps) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getPlayerSession(code);
    let resolvedPlayerId = session?.playerId ?? null;

    if (!resolvedPlayerId && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("p");
      const matchingPlayer = fromUrl
        ? initialPlayers.find((p) => p.id === fromUrl)
        : undefined;
      if (matchingPlayer) {
        resolvedPlayerId = matchingPlayer.id;
        savePlayerSession(code, {
          playerId: matchingPlayer.id,
          nickname: matchingPlayer.nickname,
        });
      }
    }

    setPlayerId(resolvedPlayerId);
    setChecked(true);
  }, [code, initialPlayers]);

  const playerStillInGame =
    playerId !== null && initialPlayers.some((p) => p.id === playerId);

  if (!checked) return null;

  if (!playerStillInGame) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink/70">
          Impossible de retrouver ta place dans cette partie sur cet appareil.
        </p>
        <Button onClick={() => router.push("/")}>Retour à l&apos;accueil</Button>
      </div>
    );
  }

  return (
    <GameRoot
      initialGame={initialGame}
      initialPlayers={initialPlayers}
      initialWords={initialWords}
      initialRounds={initialRounds}
      currentPlayerId={playerId as string}
    />
  );
}
