"use client";

import { useEffect } from "react";

/** Enregistre le service worker PWA après le premier rendu. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Échec silencieux : l'application reste utilisable sans PWA
        // (simplement sans installation à l'écran d'accueil ni mode hors-ligne).
      });
    });
  }, []);

  return null;
}
