"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayerSession } from "@/lib/session";
import { WaitingRoom } from "@/components/salon/WaitingRoom";
import { Button } from "@/components/ui/Button";
import type { Game, Player, Word } from "@/types";

interface SalonGateProps {
  code: string;
  initialGame: Game;
  initialPlayers: Player[];
  initialWords: Word[];
}

/**
 * Ce composant vérifie, côté client, que l'appareil a bien une session
 * locale pour cette partie (identifiant temporaire stocké au moment de la
 * création/connexion). C'est ce qui permet de retrouver son profil après
 * un rechargement de page (voir section 11 du cahier des charges).
 */
export function SalonGate({ code, initialGame, initialPlayers, initialWords }: SalonGateProps) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getPlayerSession(code);
    setPlayerId(session?.playerId ?? null);
    setChecked(true);
  }, [code]);

  const playerStillInGame =
    playerId !== null && initialPlayers.some((p) => p.id === playerId);

  if (!checked) {
    return null;
  }

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
    <WaitingRoom
      initialGame={initialGame}
      initialPlayers={initialPlayers}
      initialWords={initialWords}
      currentPlayerId={playerId as string}
    />
  );
}
