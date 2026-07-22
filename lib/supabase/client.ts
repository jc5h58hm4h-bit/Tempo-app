"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

/**
 * Client Supabase utilisé côté navigateur : souscriptions Realtime et
 * lectures. Il n'utilise que la clé publique "anon" — la sécurité repose
 * sur les policies RLS définies dans supabase/schema.sql (Partie 4),
 * jamais sur ce client.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error(
        "Variables Supabase manquantes. Vérifie ton fichier .env.local (voir .env.example)."
      );
    }

    browserClient = createClient(url, anonKey);
  }
  return browserClient;
}
