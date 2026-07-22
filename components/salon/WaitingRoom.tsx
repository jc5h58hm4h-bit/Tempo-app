"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useGameRealtime } from "@/hooks/useGameRealtime";
import { usePresence } from "@/hooks/usePresence";
import { CodeDisplay } from "@/components/salon/CodeDisplay";
import { PlayerList } from "@/components/salon/PlayerList";
import { WordManager } from "@/components/salon/WordManager";
import { Button } from "@/components/ui/Button";
import { setPlayerReady, markPlayerConnected, startGame } from "@/app/actions/game-actions";
import { GAME_RULES } from "@/types";
import type { Game, Player, Word } from "@/types";

interface WaitingRoomProps {
  initialGame: Game;
  initialPlayers: Player[];
  initialWords: Word[];
  currentPlayerId: string;
}

export function WaitingRoom({
  initialGame,
  initialPlayers,
  initialWords,
  currentPlayerId,
}: WaitingRoomProps) {
  const router = useRouter();
  const { game, players, words } = useGameRealtime(
    initialGame.id,
    initialGame,
    initialPlayers,
    initialWords
  );
  const [isReadyPending, startReadyTransition] = useTransition();
  const [isStartPending, startStartTransition] = useTransition();
  const [startError, setStartError] = useState<string | undefined>();
  const onlinePlayerIds = usePresence(game.id, currentPlayerId);

  useEffect(() => {
    markPlayerConnected(currentPlayerId);
  }, [currentPlayerId]);

  // Dès que l'hôte a lancé la partie, tout le monde est redirigé vers
  // l'écran de constitution des équipes / de jeu.
  useEffect(() => {
    if (game.status !== "lobby") {
      router.push(`/partie/${game.code}`);
    }
  }, [game.status, game.code, router]);

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const isHost = game.hostPlayerId === currentPlayerId;

  const canStart = useMemo(() => {
    return (
      players.length >= GAME_RULES.MIN_PLAYERS &&
      players.every((p) => p.isReady) &&
      words.length > 0
    );
  }, [players, words]);

  function handleToggleReady() {
    if (!currentPlayer) return;
    const nextReady = !currentPlayer.isReady;
    startReadyTransition(async () => {
      await setPlayerReady(currentPlayer.id, nextReady);
    });
  }

  function handleStart() {
    setStartError(undefined);
    startStartTransition(async () => {
      const result = await startGame(game.id, currentPlayerId);
      if (!result.success) {
        setStartError(result.error);
      }
      // Le statut de la partie passe à "team_setup" ; la redirection vers
      // /partie/[code] a lieu automatiquement via l'effet ci-dessus.
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-6 py-8">
      <CodeDisplay code={game.code} />
      <PlayerList players={players} onlinePlayerIds={onlinePlayerIds} />
      <WordManager
        gameId={game.id}
        hostPlayerId={currentPlayerId}
        isHost={isHost}
        words={words}
      />

      <div className="sticky bottom-4 flex flex-col gap-2 pb-safe">
        {currentPlayer && (
          <Button
            variant={currentPlayer.isReady ? "secondary" : "primary"}
            onClick={handleToggleReady}
            disabled={isReadyPending}
          >
            {currentPlayer.isReady ? "Annuler (pas prêt)" : "Je suis prêt"}
          </Button>
        )}

        {isHost && (
          <>
            <Button
              variant="yellow"
              onClick={handleStart}
              disabled={!canStart || isStartPending}
            >
              Lancer la partie
            </Button>
            {startError && (
              <p className="text-center text-sm text-red-600">{startError}</p>
            )}
            {!canStart && (
              <p className="text-center text-xs text-ink/40">
                {words.length === 0
                  ? "Ajoute au moins un mot pour pouvoir lancer la partie."
                  : "Il faut au moins 2 joueurs, tous prêts."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
