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
      ? `Le code fait ${GAME_RULES.GAME_CODE_LENGTH} chiffres.`
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
        placeholder="123456"
        value={code}
        maxLength={GAME_RULES.GAME_CODE_LENGTH}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        onBlur={() => setTouched(true)}
        error={codeError}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        className="text-center font-display text-2xl tracking-[0.3em]"
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
