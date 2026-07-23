"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { checkAccess } from "@/app/actions/auth-actions";
import { APP_NAME } from "@/lib/constants";

export function LoginForm() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(undefined);
    if (!id.trim() || !password) {
      setError("Renseigne l'identifiant et le mot de passe.");
      return;
    }

    setIsSubmitting(true);
    const result = await checkAccess(id, password);
    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    const params =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const next = params?.get("next") || "/";
    router.push(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Card className="flex flex-col gap-5 animate-pop-in">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-ink/60">
            Accès réservé — entre l&apos;identifiant et le mot de passe partagés.
          </p>
        </div>
        <Input
          id="access-id"
          label="Identifiant"
          value={id}
          onChange={(e) => setId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
        <Input
          id="access-password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Connexion..." : "Entrer"}
        </Button>
      </Card>
    </main>
  );
}
