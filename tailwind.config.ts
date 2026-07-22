import type { Config } from "tailwindcss";

// Design system "Tempo"
// - Bleu = équipe bleue, Jaune = équipe jaune
// - "cream" sert de fond neutre (blanc cassé) pour ne pas juxtaposer
//   directement le bleu et le jaune sur toute la page.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          deep: "#152A6E",   // bleu profond — équipe bleue, textes forts
          DEFAULT: "#2C4BD1",
          light: "#6FA8FF",  // bleu clair — accents, hover
          pale: "#E7EEFF",
        },
        yellow: {
          vivid: "#FFC93C",  // jaune vif — équipe jaune, CTA
          DEFAULT: "#FFC93C",
          pale: "#FFF3D6",   // jaune pâle — fonds de carte équipe jaune
        },
        cream: "#FAF7F0",    // blanc cassé — fond général
        ink: "#232323",      // gris foncé — texte principal
      },
      fontFamily: {
        // Display : Fredoka, arrondie et ludique sans être infantile —
        // utilisée uniquement pour titres, scores, code de partie.
        display: ["var(--font-fredoka)", "system-ui", "sans-serif"],
        // Body : Inter, très lisible sur petit écran.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.75rem",
      },
      boxShadow: {
        card: "0 6px 0 0 rgba(21, 42, 110, 0.12)",
        tile: "0 4px 0 0 rgba(0,0,0,0.15)",
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
