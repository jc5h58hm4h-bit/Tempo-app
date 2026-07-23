import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "tempo_session";

// Chemins accessibles sans être connecté : la page de connexion elle-même,
// la page hors-ligne PWA, les fichiers statiques nécessaires au
// fonctionnement de l'app avant même la connexion (manifest, service worker,
// icônes), et les routes API (qui ont leur propre vérification, ex: le
// nettoyage automatique appelé par Vercel Cron).
const PUBLIC_PATHS = ["/login", "/offline", "/manifest.webmanifest", "/sw.js"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico";

  if (isPublic) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const expected = process.env.APP_SESSION_SECRET;

  if (!expected || session !== expected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
