"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

export function CodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [shareUnavailable, setShareUnavailable] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Presse-papiers indisponible : on ignore silencieusement.
    }
  }

  async function handleShare() {
    const shareText = `Rejoins ma partie de Tempo ! Code : ${code}\n${window.location.origin}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Tempo", text: shareText });
      } catch {
        // L'utilisateur a annulé le partage : rien à faire.
      }
      return;
    }

    // Pas de partage natif disponible : on ouvre directement l'app SMS
    // avec le message pré-rempli.
    try {
      window.location.href = `sms:&body=${encodeURIComponent(shareText)}`;
    } catch {
      setShareUnavailable(true);
    }
  }

  return (
    <Card tone="blue" className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-blue-deep/70">
        Code de la partie
      </p>
      <div className="flex gap-1.5">
        {code.split("").map((char, i) => (
          <span
            key={i}
            className="flex h-12 w-10 items-center justify-center rounded-xl bg-white font-display text-2xl font-semibold text-blue-deep shadow-tile"
          >
            {char}
          </span>
        ))}
      </div>
      <div className="flex w-full gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 rounded-full bg-blue-deep px-4 py-2 text-sm font-medium text-cream active:translate-y-[1px]"
        >
          {copied ? "Copié !" : "Copier le code"}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-blue-deep shadow-tile active:translate-y-[1px]"
        >
          Partager
        </button>
      </div>
      {shareUnavailable && (
        <p className="text-xs text-blue-deep/60">
          Partage indisponible ici, utilise plutôt &quot;Copier le code&quot;.
        </p>
      )}
    </Card>
  );
}
