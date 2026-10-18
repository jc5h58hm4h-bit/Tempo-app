import type { Config } from "tailwindcss";

// Design system "Tempo" — direction rétro années 70-80, bleu nuit et or.
//
// Les couleurs sont des VARIABLES CSS définies dans app/globals.css : le mode
// clair et le mode sombre se règlent là-bas, en un seul endroit, sans toucher
// aux composants. Le format "rgb(var(--x) / <alpha-value>)" garde les variantes
// d'opacité (text-ink/60, bg-ink/5, border-edge/60...) pleinement fonctionnelles.
//
// Rôles historiques conservés pour ne rien casser :
//   blue   = équipe bleue et boutons principaux
//   yellow = équipe jaune (or) et boutons d'accent
//   cream  = fond général          ink = texte principal
//   edge   = contour et arête des boutons / cartes (effet "relief" rétro)
const rgbVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          deep: rgbVar("--c-blue-deep"), // bleu nuit — équipe bleue, boutons principaux
          DEFAULT: rgbVar("--c-blue"),   // survol, focus
          light: rgbVar("--c-blue-light"),
          pale: rgbVar("--c-blue-pale"), // fonds de carte équipe bleue
        },
        yellow: {
          vivid: rgbVar("--c-yellow"),   // or moutarde — équipe jaune, accents
          DEFAULT: rgbVar("--c-yellow"),
          pale: rgbVar("--c-yellow-pale"), // fonds de carte équipe jaune
        },
        cream: rgbVar("--c-cream"),      // papier crème (clair) / nuit profonde (sombre)
        ink: rgbVar("--c-ink"),          // texte principal
        edge: rgbVar("--c-edge"),        // contours et arêtes
        // Bandes décoratives façon années 70 (identiques en clair et en sombre)
        retro: {
          orange: "#D9622B",
          brick: "#B5341F",
        },
      },
      fontFamily: {
        // Display : Righteous, ronde et "affiche des années 70" — titres,
        // boutons, scores, tuiles. Elle n'existe qu'en graisse normale.
        display: ["var(--font-righteous)", "system-ui", "sans-serif"],
        // Body : Inter, très lisible sur petit écran.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.75rem",
      },
      boxShadow: {
        // Arêtes pleines (sans flou) : l'effet "touche en relief" rétro.
        card: "0 5px 0 0 rgb(var(--c-edge))",
        tile: "0 4px 0 0 rgb(var(--c-edge))",
        pressed: "0 2px 0 0 rgb(var(--c-edge))",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "pop-in": "pop-in 180ms ease-out",
      },
      spacing: {
        safe: "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [],
};

export default config;
