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
import { PlayerManagementDrawer } from "@/components/game/PlayerManagementDrawer";
import { BuzzerDescriberScreen } from "@/components/game/BuzzerDescriberScreen";
import { BuzzerGuesserScreen } from "@/components/game/BuzzerGuesserScreen";
import { startTurn, recordGuessedWord, endTurn, startNextRound, useHint } from "@/app/actions/round-actions";
import { startBuzzerTurn, pressBuzzer, resolveBuzz, skipBuzzerWord } from "@/app/actions/buzzer-actions";
import { markPlayerConnected } from "@/app/actions/game-actions";
import { CHRONO_MAX_PASSES } from "@/types";
import type { Game, Player, Round, Word } from "@/types";

interface WordQueueItem {
  id: string;
  content: string;
  hint?: string | null;
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
  const [buzzerWordQueue, setBuzzerWordQueue] = useState<WordQueueItem[] | null>(null);
  const [readyError, setReadyError] = useState<string | undefined>();

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const isHost = game.hostPlayerId === currentPlayerId;
  const isMyTurn = game.currentPlayerId === currentPlayerId;
  const currentRound = rounds.find((r) => r.roundNumber === game.currentRound) ?? null;
  const activePlayer = players.find((p) => p.id === game.currentPlayerId) ?? null;
  const isBuzzerMode = game.mode === "buzzer";

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
      setBuzzerWordQueue(null);
    }
  }, [isMyTurn, game.status, game.currentPlayerId]);

  async function handleReady() {
    if (!currentRound) return;
    setReadyError(undefined);

    if (isBuzzerMode) {
      const result = await startBuzzerTurn(game.id, currentRound.id, currentPlayerId);
      if (!result.success) {
        setReadyError(result.error);
        return;
      }
      setBuzzerWordQueue(result.data.wordQueue);
      setTurnPhase("playing");
      return;
    }

    if (!currentPlayer?.team) return;
    const result = await startTurn(game.id, currentRound.id, currentPlayerId, currentPlayer.team);
    if (!result.success) {
      setReadyError(result.error);
      return;
    }
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

  async function handleUseHint() {
    const result = await useHint(game.id, currentPlayerId);
    return { success: result.success };
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

  async function handleBuzz() {
    await pressBuzzer(game.id, currentPlayerId);
  }

  async function handleResolveBuzz(correct: boolean) {
    if (!currentRound || !game.buzzerPlayerId) return;
    await resolveBuzz(game.id, currentRound.id, currentPlayerId, game.buzzerPlayerId, correct);
  }

  async function handleSkipBuzzerWord() {
    if (!currentRound) return;
    await skipBuzzerWord(game.id, currentRound.id, currentPlayerId);
  }

  // --- Rendu ---------------------------------------------------------

  function renderContent() {
    if (game.status === "team_setup") {
      return (
        <TeamSetupScreen
          gameId={game.id}
          hostPlayerId={game.hostPlayerId}
          isHost={isHost}
          players={players}
          gameMode={game.mode}
          buzzerWordsPerTurn={game.buzzerWordsPerTurn}
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
          gameMode={game.mode}
        />
      );
    }

    // --- Mode Buzzer : tous les joueurs sont actifs en même temps -------
    if (game.status === "in_progress" && currentRound && isBuzzerMode) {
      if (isMyTurn) {
        if (turnPhase === "playing" && buzzerWordQueue) {
          const currentIndex = Math.max(
            0,
            buzzerWordQueue.findIndex((w) => w.id === game.buzzerCurrentWordId)
          );
          const currentWord = buzzerWordQueue[currentIndex];
          const buzzerNickname =
            players.find((p) => p.id === game.buzzerPlayerId)?.nickname ?? null;

          return (
            <BuzzerDescriberScreen
              word={currentWord?.content ?? "…"}
              hint={currentWord?.hint ?? null}
              wordsRemaining={buzzerWordQueue.length - currentIndex}
              totalWords={buzzerWordQueue.length}
              buzzerNickname={buzzerNickname}
              hintUsed={currentPlayer?.hintUsed}
              onResolve={handleResolveBuzz}
              onSkip={handleSkipBuzzerWord}
              onUseHint={handleUseHint}
            />
          );
        }
        return (
          <TransitionScreen
            playerNickname={currentPlayer?.nickname ?? ""}
            team={null}
            onReady={handleReady}
            error={readyError}
          />
        );
      }

      if (activePlayer) {
        const buzzerNickname =
          players.find((p) => p.id === game.buzzerPlayerId)?.nickname ?? null;
        return (
          <BuzzerGuesserScreen
            describerNickname={activePlayer.nickname}
            buzzerNickname={buzzerNickname}
            isBuzzer={game.buzzerPlayerId === currentPlayerId}
            onBuzz={handleBuzz}
          />
        );
      }
    }

    // --- Modes Classique / Chrono ----------------------------------------
    if (game.status === "in_progress" && currentRound && !isBuzzerMode) {
      if (isMyTurn && currentPlayer?.team) {
        if (turnPhase === "playing" && turnData) {
          return (
            <PlayingScreen
              round={currentRound.roundNumber}
              team={currentPlayer.team}
              mode={game.mode}
              durationSeconds={game.turnDurationSeconds}
              initialQueue={turnData.queue}
              blueScore={currentRound.blueTeamScore}
              yellowScore={currentRound.yellowTeamScore}
              maxPasses={game.mode === "chrono" ? CHRONO_MAX_PASSES : undefined}
              hintUsed={currentPlayer.hintUsed}
              onWordFound={handleWordFound}
              onTurnEnd={handleTurnEnd}
              onUseHint={handleUseHint}
            />
          );
        }
        return (
          <TransitionScreen
            playerNickname={currentPlayer.nickname}
            team={currentPlayer.team}
            onReady={handleReady}
            error={readyError}
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

  return (
    <>
      {renderContent()}
      {isHost && game.status !== "finished" && (
        <PlayerManagementDrawer gameId={game.id} hostPlayerId={game.hostPlayerId} players={players} />
      )}
    </>
  );
}
