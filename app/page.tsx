"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { APP_NAME, APP_DESCRIPTION, PRESET_NICKNAMES } from "@/lib/constants";
import { isValidNickname, normalizeGameCode } from "@/lib/utils";
import { savePlayerSession } from "@/lib/session";
import { createGame, joinGame } from "@/app/actions/game-actions";
import { GAME_RULES } from "@/types";

type Screen = "home" | "create" | "join";

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      {screen === "home" && <HomeScreen onNavigate={setScreen} />}
      {screen === "create" && <CreateGameScreen onBack={() => setScreen("home")} />}
      {screen === "join" && <JoinGameScreen onBack={() => setScreen("home")} />}
    </main>
  );
}

function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center gap-10 animate-pop-in">
      {/* Signature : le "code de partie" mis en scène comme un plateau de jeu,
          composé de tuiles bleues/jaunes en alternance — annonce le concept
          central de l'app avant même d'expliquer les règles. */}
      <div className="flex gap-2">
        {["T", "E", "M", "P", "O"].map((letter, i) => (
          <div
            key={i}
            className={`flex h-12 w-12 items-center justify-center rounded-xl font-display text-xl font-semibold shadow-tile ${
              i % 2 === 0 ? "bg-blue-deep text-cream" : "bg-yellow-vivid text-ink"
            }`}
          >
            {letter}
          </div>
        ))}
      </div>

      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {APP_NAME}
        </h1>
        <p className="mt-2 text-ink/60">{APP_DESCRIPTION}</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button variant="primary" onClick={() => onNavigate("create")}>
          Créer une partie
        </Button>
        <Button variant="yellow" onClick={() => onNavigate("join")}>
          Rejoindre une partie
        </Button>
      </div>

      <p className="text-center text-sm text-ink/40">
        De {GAME_RULES.MIN_PLAYERS} à {GAME_RULES.MAX_PLAYERS} joueurs · aucun
        compte nécessaire
      </p>

      <Link href="/stats" className="text-sm font-medium text-blue-deep underline">
        🏆 Classement annuel
      </Link>
    </div>
  );
}

function NicknamePicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (nickname: string) => void;
  error?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink/70">Ton pseudo</p>
      <div className="flex flex-wrap gap-2">
        {PRESET_NICKNAMES.map((name) => {
          const isSelected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-blue-deep text-cream"
                  : "bg-ink/5 text-ink/70"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function CreateGameScreen({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();

  const nicknameError =
    touched && !isValidNickname(nickname)
      ? "Choisis un pseudo entre 1 et 20 caractères."
      : undefined;

  async function handleCreate() {
    setTouched(true);
    setServerError(undefined);
    if (!isValidNickname(nickname)) return;

    setIsSubmitting(true);
    const result = await createGame(nickname.trim());
    if (!result.success) {
      setServerError(result.error);
      setIsSubmitting(false);
      return;
    }
    savePlayerSession(result.data.gameCode, {
      playerId: result.data.playerId,
      nickname: nickname.trim(),
    });
    router.push(`/salon/${result.data.gameCode}?p=${result.data.playerId}`);
  }

  return (
    <Card className="flex flex-col gap-5 animate-pop-in">
      <button onClick={onBack} className="self-start text-sm text-ink/50">
        ← Retour
      </button>
      <div>
        <h2 className="font-display text-2xl font-semibold">Créer une partie</h2>
        <p className="mt-1 text-sm text-ink/60">
          Tu seras l&apos;hôte de la partie. Choisis d&apos;abord ton pseudo.
        </p>
      </div>
      <NicknamePicker
        value={nickname}
        onChange={(name) => {
          setNickname(name);
          setTouched(true);
        }}
        error={nicknameError}
      />
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button onClick={handleCreate} disabled={isSubmitting}>
        {isSubmitting ? "Création..." : "Créer la partie"}
      </Button>
    </Card>
  );
}

function JoinGameScreen({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();

  const normalizedCode = normalizeGameCode(code);
  const codeError =
    touched && normalizedCode.length !== GAME_RULES.GAME_CODE_LENGTH
      ? `Le code fait ${GAME_RULES.GAME_CODE_LENGTH} caractères.`
      : undefined;
  const nicknameError =
    touched && !isValidNickname(nickname)
      ? "Choisis un pseudo entre 1 et 20 caractères."
      : undefined;

  async function handleJoin() {
    setTouched(true);
    setServerError(undefined);
    if (codeError !== undefined || !isValidNickname(nickname)) return;
    if (normalizedCode.length !== GAME_RULES.GAME_CODE_LENGTH) return;

    setIsSubmitting(true);
    const result = await joinGame(normalizedCode, nickname.trim());
    if (!result.success) {
      setServerError(result.error);
      setIsSubmitting(false);
      return;
    }
    savePlayerSession(result.data.gameCode, {
      playerId: result.data.playerId,
      nickname: nickname.trim(),
    });
    router.push(`/salon/${result.data.gameCode}?p=${result.data.playerId}`);
  }

  return (
    <Card className="flex flex-col gap-5 animate-pop-in" tone="blue">
      <button onClick={onBack} className="self-start text-sm text-ink/50">
        ← Retour
      </button>
      <div>
        <h2 className="font-display text-2xl font-semibold">Rejoindre une partie</h2>
        <p className="mt-1 text-sm text-ink/60">
          Demande le code à l&apos;hôte de la partie.
        </p>
      </div>
      <Input
        id="game-code"
        label="Code de la partie"
        placeholder="AB12CD"
        value={code}
        maxLength={GAME_RULES.GAME_CODE_LENGTH}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onBlur={() => setTouched(true)}
        error={codeError}
        autoCapitalize="characters"
        autoFocus
      />
      <NicknamePicker
        value={nickname}
        onChange={(name) => {
          setNickname(name);
          setTouched(true);
        }}
        error={nicknameError}
      />
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button variant="yellow" onClick={handleJoin} disabled={isSubmitting}>
        {isSubmitting ? "Connexion..." : "Rejoindre"}
      </Button>
    </Card>
  );
}
