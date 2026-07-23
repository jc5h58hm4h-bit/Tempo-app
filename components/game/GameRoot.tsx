"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameRealtime } from "@/hooks/useGameRealtime";
import { usePresence } from "@/hooks/usePresence";
import { TeamSetupScreen } from "@/components/game/TeamSetupScreen";
import { TransitionScreen } from "@/components/game/TransitionScreen";
import { PlayingScreen } from "@/components/game/PlayingScreen";
import { TurnSummary } from "@/components/game/TurnSummary";
import { SpectatorScreen } from "@/components/game/SpectatorScreen";
import { RoundSummary } from "@/components/game/RoundSummary";
import { FinalScreen } from "@/components/game/FinalScreen";
import { startTurn, recordGuessedWord, endTurn, startNextRound } from "@/app/actions/round-actions";
import { markPlayerConnected } from "@/app/actions/game-actions";
import type { Game, Player, Round, Word } from "@/types";

interface WordQueueItem {
  id: string;
  content: string;
}

type TurnPhase = "idle" | "transition" | "playing" | "turn_summary";

interface GameRootProps {
  initialGame: Game;
  initialPlayers: Player[];
  initialWords: Word[];
  initialRounds: Round[];
  currentPlayerId: string;
}

export function GameRoot({
  initialGame,
  initialPlayers,
  initialWords,
  initialRounds,
  currentPlayerId,
}: GameRootProps) {
  const router = useRouter();
  const { game, players, rounds } = useGameRealtime(
    initialGame.id,
    initialGame,
    initialPlayers,
    initialWords,
    initialRounds
  );

  const [turnPhase, setTurnPhase] = useState<TurnPhase>("idle");
  const [turnData, setTurnData] = useState<{ turnId: string; queue: WordQueueItem[] } | null>(
    null
  );
  const [summaryWords, setSummaryWords] = useState<string[]>([]);

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const isHost = game.hostPlayerId === currentPlayerId;
  const isMyTurn = game.currentPlayerId === currentPlayerId;
  const currentRound = rounds.find((r) => r.roundNumber === game.currentRound) ?? null;
  const activePlayer = players.find((p) => p.id === game.currentPlayerId) ?? null;

  usePresence(game.id, currentPlayerId);

  useEffect(() => {
    markPlayerConnected(currentPlayerId);
  }, [currentPlayerId]);

  // Redirige vers le salon si, pour une raison quelconque, la partie
  // n'a pas (ou plus) démarré (ex: rechargement avant le lancement).
  useEffect(() => {
    if (game.status === "lobby") {
      router.replace(`/salon/${game.code}?p=${currentPlayerId}`);
    }
  }, [game.status, game.code, currentPlayerId, router]);

  // Dès que c'est (à nouveau) le tour de ce joueur, on repart sur l'écran
  // de transition "Passe le téléphone à...".
  useEffect(() => {
    if (isMyTurn && game.status === "in_progress") {
      setTurnPhase("transition");
      setTurnData(null);
    }
  }, [isMyTurn, game.status, game.currentPlayerId]);

  async function handleReady() {
    if (!currentRound || !currentPlayer?.team) return;
    const result = await startTurn(game.id, currentRound.id, currentPlayerId, currentPlayer.team);
    if (!result.success) return;
    setTurnData({ turnId: result.data.turnId, queue: result.data.wordQueue });
    setTurnPhase("playing");
  }

  async function handleWordFound(word: WordQueueItem) {
    if (!currentRound || !currentPlayer?.team || !turnData) {
      return { success: false, roundComplete: false };
    }
    const result = await recordGuessedWord(
      game.id,
      currentRound.id,
      turnData.turnId,
      word.id,
      currentPlayerId,
      currentPlayer.team
    );
    if (!result.success) return { success: false, roundComplete: false };
    return { success: true, roundComplete: result.data.roundComplete };
  }

  function handleTurnEnd(foundWords: WordQueueItem[], roundComplete: boolean) {
    if (!currentRound || !turnData) return;
    setSummaryWords(foundWords.map((w) => w.content));
    setTurnPhase("turn_summary");
    void endTurn(game.id, currentRound.id, turnData.turnId, foundWords.length, roundComplete);
  }

  function handleContinueFromSummary() {
    setTurnPhase("idle");
    setTurnData(null);
  }

  async function handleNextRound() {
    await startNextRound(game.id, game.hostPlayerId);
  }

  // --- Rendu ---------------------------------------------------------

  if (game.status === "team_setup") {
    return (
      <TeamSetupScreen
        gameId={game.id}
        hostPlayerId={game.hostPlayerId}
        isHost={isHost}
        players={players}
      />
    );
  }

  if (turnPhase === "turn_summary") {
    return (
      <TurnSummary
        foundWords={summaryWords}
        onContinue={handleContinueFromSummary}
        isPending={false}
      />
    );
  }

  if (game.status === "round_summary" && currentRound) {
    return (
      <RoundSummary
        roundNumber={currentRound.roundNumber}
        blueScore={currentRound.blueTeamScore}
        yellowScore={currentRound.yellowTeamScore}
        isHost={isHost}
        onNextRound={handleNextRound}
        isPending={false}
      />
    );
  }

  if (game.status === "finished") {
    return (
      <FinalScreen
        gameId={game.id}
        gameCode={game.code}
        hostPlayerId={game.hostPlayerId}
        isHost={isHost}
        players={players}
      />
    );
  }

  if (game.status === "in_progress" && currentRound) {
    if (isMyTurn && currentPlayer?.team) {
      if (turnPhase === "playing" && turnData) {
        return (
          <PlayingScreen
            round={currentRound.roundNumber}
            team={currentPlayer.team}
            durationSeconds={game.turnDurationSeconds}
            initialQueue={turnData.queue}
            blueScore={currentRound.blueTeamScore}
            yellowScore={currentRound.yellowTeamScore}
            onWordFound={handleWordFound}
            onTurnEnd={handleTurnEnd}
          />
        );
      }
      return (
        <TransitionScreen
          playerNickname={currentPlayer.nickname}
          team={currentPlayer.team}
          onReady={handleReady}
        />
      );
    }

    if (activePlayer?.team) {
      return (
        <SpectatorScreen
          round={currentRound.roundNumber}
          blueScore={currentRound.blueTeamScore}
          yellowScore={currentRound.yellowTeamScore}
          activePlayerNickname={activePlayer.nickname}
          activeTeam={activePlayer.team}
        />
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center text-ink/40">
      Préparation de la partie...
    </div>
  );
}
