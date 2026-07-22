import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function SalonNotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Partie introuvable</h1>
      <p className="text-ink/60">
        Ce code ne correspond à aucune partie active. Vérifie le code ou
        demande-le à nouveau à l&apos;hôte.
      </p>
      <Link href="/" className="w-full">
        <Button>Retour à l&apos;accueil</Button>
      </Link>
    </div>
  );
}
