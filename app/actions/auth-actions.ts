"use server";

import { cookies } from "next/headers";
import type { ActionResult } from "@/lib/action-result";

const SESSION_COOKIE_NAME = "tempo_session";

/**
 * Vérifie l'identifiant et le mot de passe partagés (identiques pour l'hôte
 * et les invités) contre les variables d'environnement serveur, jamais
 * exposées au navigateur. En cas de succès, pose un cookie de session
 * httpOnly qui laisse passer les prochaines requêtes (voir middleware.ts).
 */
export async function checkAccess(
  id: string,
  password: string
): Promise<ActionResult<null>> {
  const expectedId = process.env.APP_ACCESS_ID;
  const expectedPassword = process.env.APP_ACCESS_PASSWORD;
  const sessionSecret = process.env.APP_SESSION_SECRET;

  if (!expectedId || !expectedPassword || !sessionSecret) {
    return {
      success: false,
      error: "Configuration d'accès manquante côté serveur (variables d'environnement).",
    };
  }

  if (id.trim() !== expectedId || password !== expectedPassword) {
    return { success: false, error: "Identifiant ou mot de passe incorrect." };
  }

  cookies().set(SESSION_COOKIE_NAME, sessionSecret, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });

  return { success: true, data: null };
}
