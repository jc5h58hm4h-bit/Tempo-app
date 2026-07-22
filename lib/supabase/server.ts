import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase utilisé dans les Server Actions (app/actions/*).
 * Un nouveau client léger est créé à chaque appel plutôt qu'un singleton,
 * car il tourne côté serveur sans état de session.
 *
 * IMPORTANT : on utilise volontairement la clé "anon" ici aussi, jamais la
 * clé Service Role. La clé Service Role ne doit être introduite que si une
 * action nécessite explicitement de contourner le RLS (voir Partie 4,
 * section Sécurité) — et dans ce cas uniquement dans un fichier serveur,
 * jamais exposée au bundle client.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variables Supabase manquantes côté serveur. Vérifie ton fichier .env.local."
    );
  }

  return createClient(url, anonKey);
}
