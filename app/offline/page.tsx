import { Card } from "@/components/ui/Card";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Card className="flex flex-col items-center gap-3">
        <p className="text-3xl">📡</p>
        <h1 className="font-display text-xl font-semibold">Pas de connexion</h1>
        <p className="text-ink/60">
          Tempo a besoin d&apos;internet pour synchroniser la partie en
          temps réel. Vérifie ta connexion puis réessaie.
        </p>
      </Card>
    </main>
  );
}
