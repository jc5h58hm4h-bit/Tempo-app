import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function PartieNotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Partie introuvable</h1>
      <p className="text-ink/60">
        Cette partie n&apos;existe pas ou plus.
      </p>
      <Link href="/" className="w-full">
        <Button>Retour à l&apos;accueil</Button>
      </Link>
    </div>
  );
}
