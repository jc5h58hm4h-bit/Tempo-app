"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

export function CodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permissions...) :
      // on ignore silencieusement, le code reste affichable manuellement.
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
      <button
        onClick={handleCopy}
        className="rounded-full bg-blue-deep px-4 py-2 text-sm font-medium text-cream active:translate-y-[1px]"
      >
        {copied ? "Copié !" : "Copier le code"}
      </button>
    </Card>
  );
}
