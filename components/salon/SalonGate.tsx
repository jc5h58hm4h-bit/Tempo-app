"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlayerSession, savePlayerSession } from "@/lib/session";
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
 *
 * Si le stockage local est vide (ex: le lien a été ouvert dans le
 * mini-navigateur de l'app Messages, dont le stockage est isolé de Safari),
 * on se rabat sur l'identifiant de joueur transmis dans l'URL (paramètre
 * ?p=) au moment de la redirection depuis l'accueil, et on le réenregistre
 * localement pour la suite.
 */
export function SalonGate({ code, initialGame, initialPlayers, initialWords }: SalonGateProps) {
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
