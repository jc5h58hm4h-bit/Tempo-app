import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FINISHED_GAME_MAX_AGE_DAYS = 30;
const ABANDONED_LOBBY_MAX_AGE_DAYS = 2;

/**
 * Nettoyage automatique de la base : supprime les parties terminées depuis
 * longtemps, et les parties jamais lancées (salon abandonné). La suppression
 * d'une partie entraîne, en cascade côté base de données, celle de ses
 * joueurs, mots, manches, tours et mots trouvés — aucune requête séparée
 * n'est nécessaire pour ces tables.
 *
 * Appelée automatiquement une fois par jour par Vercel Cron (voir
 * vercel.json). Vercel ajoute automatiquement un en-tête
 * "Authorization: Bearer <CRON_SECRET>" pour les appels programmés, à
 * condition qu'une variable d'environnement CRON_SECRET soit définie —
 * c'est ce qu'on vérifie ci-dessous pour empêcher un appel non autorisé.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  const finishedCutoff = new Date(
    Date.now() - FINISHED_GAME_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const abandonedCutoff = new Date(
    Date.now() - ABANDONED_LOBBY_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: finishedDeleted, error: finishedError } = await supabase
    .from("games")
    .delete()
    .eq("status", "finished")
    .lt("updated_at", finishedCutoff)
    .select("id");

  const { data: abandonedDeleted, error: abandonedError } = await supabase
    .from("games")
    .delete()
    .eq("status", "lobby")
    .lt("created_at", abandonedCutoff)
    .select("id");

  if (finishedError || abandonedError) {
    return NextResponse.json(
      {
        error: "Erreur pendant le nettoyage",
        finishedError: finishedError?.message,
        abandonedError: abandonedError?.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    finishedGamesDeleted: finishedDeleted?.length ?? 0,
    abandonedLobbiesDeleted: abandonedDeleted?.length ?? 0,
  });
}
