/**
 * Mots de démonstration utilisables en développement (tests manuels,
 * remplissage rapide d'une partie locale). Jamais insérés automatiquement
 * dans une vraie partie : à copier/coller volontairement dans le champ
 * d'import multiple du salon d'attente si besoin.
 */
export const DEMO_WORDS: { category: string; words: string[] }[] = [
  {
    category: "Personnalités",
    words: ["Bruce Springsteen", "Marie Curie", "Michael Jordan", "Beyoncé", "Albert Einstein", "Zinédine Zidane"],
  },
  {
    category: "Films",
    words: ["Le Roi Lion", "Titanic", "Star Wars", "Amélie Poulain", "Jurassic Park", "La La Land"],
  },
  {
    category: "Musique",
    words: ["Bohemian Rhapsody", "La Marseillaise", "Thriller", "Get Lucky", "Piano", "Guitare électrique"],
  },
  {
    category: "Objets",
    words: ["Parapluie", "Tondeuse à gazon", "Grille-pain", "Boussole", "Aspirateur", "Longue-vue"],
  },
  {
    category: "Lieux",
    words: ["Tour Eiffel", "Grande Muraille de Chine", "Mont Everest", "Sahara", "Machu Picchu", "Times Square"],
  },
  {
    category: "Nourriture",
    words: ["Pizza", "Croissant", "Sushi", "Ratatouille", "Fondue savoyarde", "Tarte Tatin"],
  },
  {
    category: "Personnages fictifs",
    words: ["Harry Potter", "Batman", "Astérix", "Dark Vador", "Cendrillon", "Sherlock Holmes"],
  },
];

/** Version à plat, prête à coller dans le champ d'import multiple du salon. */
export const DEMO_WORDS_FLAT: string[] = DEMO_WORDS.flatMap((c) => c.words);
