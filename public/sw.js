// Service worker minimal pour Tempo.
// Stratégie volontairement simple pour cette v1 :
// - "network first" pour les pages (toujours essayer le réseau, qui est
//   indispensable de toute façon pour le temps réel Supabase),
// - repli sur /offline si le réseau est indisponible pendant une navigation,
// - mise en cache légère des icônes et du manifest pour un démarrage rapide.

const CACHE_NAME = "tempo-shell-v1";
const APP_SHELL = ["/offline", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Seules les navigations (changement de page) déclenchent le repli
  // hors-ligne : le jeu en lui-même dépend du réseau pour fonctionner.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline"))
    );
    return;
  }

  if (APP_SHELL.some((path) => request.url.endsWith(path))) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
