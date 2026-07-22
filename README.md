# Tempo 🎉

Un jeu de mots à faire deviner à ton équipe, jouable à 2, 3 ou 4 joueurs
depuis un téléphone. Inspiré de Time's Up, sans les compte utilisateurs :
un code de partie à partager suffit.

> Le nom "Tempo" est temporaire et se change en un seul endroit :
> `lib/constants.ts`, constante `APP_NAME`.

---

## 1. Le concept

- Un joueur crée une partie : l'application génère un **code à 6 caractères**
  (ex. `AB12CD`) à partager avec les autres.
- Les autres le rejoignent avec ce code + un pseudo, sans créer de compte.
- L'hôte ajoute une liste de mots (un par un, ou collés en une fois).
- L'hôte répartit les joueurs en **équipe bleue** et **équipe jaune**.
- La partie se joue en **2 manches**, avec exactement la même liste de mots :
  1. **Description libre** — tous les mots sont autorisés pour faire deviner,
     sauf le mot lui-même.
  2. **Un seul mot** — un seul mot autorisé pour faire deviner.
- Chaque joueur, à tour de rôle, a 30 (ou 45, ou 60) secondes pour faire
  deviner un maximum de mots à son équipe.
- À la fin des 2 manches, l'équipe qui a trouvé le plus de mots gagne.

---

## 2. La stack technique

| Brique | Rôle |
|---|---|
| **Next.js (App Router) + TypeScript** | Application web, Server Actions pour toute la logique sensible |
| **Tailwind CSS** | Design system (voir `tailwind.config.ts`) |
| **Supabase** | Base de données PostgreSQL + temps réel (Realtime) |
| **Vercel** | Hébergement |
| **PWA** | Installation sur l'écran d'accueil, iPhone et Android |

Aucun compte utilisateur : chaque joueur a un identifiant temporaire stocké
dans le navigateur (`localStorage`), ce qui permet de retrouver sa partie
après un rechargement de page.

---

## 3. Installation en local

Prérequis : [Node.js](https://nodejs.org) version 18 ou plus.

```bash
# Dans le dossier du projet
npm install
```

---

## 4. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte (gratuit).
2. Clique sur **New project**.
3. Choisis un nom (ex. `tempo`), un mot de passe pour la base de données
   (garde-le de côté, tu n'en auras normalement pas besoin ensuite), et une
   région proche de toi.
4. Attends 1 à 2 minutes que le projet soit prêt.

---

## 5. Exécuter le script SQL

1. Dans le tableau de bord Supabase, ouvre **SQL Editor** (menu de gauche).
2. Clique sur **New query**.
3. Ouvre le fichier `supabase/schema.sql` de ce projet, copie tout son
   contenu, colle-le dans l'éditeur SQL de Supabase.
4. Clique sur **Run**.

Ce script crée toutes les tables, les règles de sécurité et active le temps
réel. Tu peux le relancer sans risque si besoin (il ne créera pas de doublons).

---

## 6. Configurer les variables d'environnement

1. Dans Supabase, va dans **Project Settings** (icône engrenage) → **API**.
2. Note deux valeurs :
   - **Project URL** (ex. `https://xxxxx.supabase.co`)
   - **anon public** (une longue clé qui commence en général par `eyJ...`)
3. À la racine du projet, duplique `.env.example` en `.env.local` :

```bash
cp .env.example .env.local
```

4. Ouvre `.env.local` et complète :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`.env.local` n'est jamais envoyé sur GitHub (voir `.gitignore`).

---

## 7. Lancer l'application

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Pour tester à
plusieurs joueurs en local, ouvre plusieurs onglets (ou utilise ton
téléphone sur le même réseau Wi-Fi, en remplaçant `localhost` par l'adresse
IP locale de ton ordinateur).

Autres commandes utiles :

```bash
npm run build       # build de production
npm run lint         # vérifie le style du code
npm run typecheck    # vérifie les types TypeScript
npm test              # lance les tests
```

---

## 8. Connexion à GitHub (avec Working Copy sur iPhone)

1. Crée un nouveau dépôt sur [github.com](https://github.com) (bouton vert
   **New**), sans README (le projet en a déjà un).
2. Dans Working Copy : **+** → **Create new repository** ou **Clone**, selon
   que tu pars du dossier existant ou d'un dépôt vide.
3. Ajoute tous les fichiers du projet dans le dossier du dépôt Working Copy.
4. Fais un **Commit** (message ex. "Version initiale de Tempo"), puis
   **Push** vers GitHub.

Le fichier `.gitignore` est déjà configuré pour ne jamais envoyer
`node_modules`, `.env.local` ou les fichiers de build.

---

## 9. Déploiement sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec ton compte
   GitHub.
2. Clique sur **Add New → Project**, choisis ton dépôt `tempo-app`.
3. Vercel détecte automatiquement Next.js, pas besoin de changer les réglages
   de build.
4. Avant de déployer, ouvre **Environment Variables** et ajoute les deux
   mêmes variables que dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique sur **Deploy**.

À chaque `push` sur la branche principale de GitHub, Vercel redéploie
automatiquement.

---

## 10. Configuration PWA (ajout à l'écran d'accueil)

L'application est déjà configurée comme PWA :

- `public/manifest.webmanifest` : nom, icônes, couleurs.
- `public/icons/*.png` : icônes temporaires (à remplacer par les tiennes
  quand tu veux, mêmes noms de fichiers et mêmes tailles : 192×192, 512×512,
  512×512 "maskable", et 180×180 pour `apple-touch-icon.png`).
- `public/sw.js` : service worker (mise en cache légère + page hors ligne).
- `app/offline/page.tsx` : page affichée sans connexion.

**Sur iPhone (Safari)** : ouvrir le site → bouton Partager → "Sur l'écran
d'accueil".
**Sur Android (Chrome)** : un bandeau "Ajouter à l'écran d'accueil"
apparaît automatiquement, ou menu ⋮ → "Installer l'application".

---

## 11. Fonctionnalités déjà présentes

- Création / connexion à une partie par code, sans compte.
- Salon d'attente en temps réel (joueurs, statut prêt, hôte).
- Ajout de mots (un par un ou collés en masse), suppression, anti-doublons.
- Constitution des équipes automatique ou manuelle.
- 2 manches (Description libre, Un seul mot), avec chronomètre configurable
  (30/45/60s).
- Écran de jeu mobile complet : mot caché aux autres joueurs, Trouvé/Passer,
  résumé de tour, résumé de manche, écran de fin de partie.
- Reprise de partie après rechargement (identifiant local).
- Transfert automatique de l'hôte en cas de déconnexion.
- Application installable (PWA), page hors-ligne.
- Tests automatisés sur les règles de jeu principales.

---

## 12. Fonctionnalités prévues plus tard

- Import de mots depuis un fichier `.txt` / `.csv` (l'architecture est prête
  côté serveur — voir `addWordsFromFileContent` dans
  `app/actions/word-actions.ts` — il ne manque qu'un champ d'upload dans
  l'interface).
- Vraie authentification (Supabase Auth) pour une isolation plus stricte
  entre joueurs, si l'application grandit au-delà d'un usage entre amis.
- Historique des parties précédentes.
- Personnalisation des icônes et couleurs par thème.

---

## 13. Problèmes connus / limites de cette version

- **Sécurité "raisonnable, pas absolue"** : sans compte utilisateur, la clé
  Supabase publique est partagée par tous. Les règles importantes (qui peut
  lancer la partie, gérer les mots...) sont vérifiées dans les Server
  Actions Next.js, mais un utilisateur techniquement motivé pourrait
  contacter directement l'API Supabase avec cette même clé. C'est un
  compromis assumé pour une V1 sans compte ; voir `supabase/schema.sql`
  pour le détail des règles RLS mises en place.
- **Le mot à deviner peut transiter dans le navigateur des autres joueurs**
  (sans jamais être affiché à l'écran) car la liste de mots est synchronisée
  en temps réel pour tout le monde. Une évolution possible serait de ne
  transmettre le mot courant qu'au joueur actif via un canal dédié.
- **Détection de déconnexion** basée sur la présence Realtime de Supabase :
  fiable en usage normal, mais une coupure réseau très brève peut
  occasionnellement déclencher un transfert d'hôte inutile.
- Pas de vraie gestion d'erreurs réseau avancée (retry automatique, etc.) :
  en cas de coupure prolongée, la page hors-ligne s'affiche et il faut
  recharger manuellement une fois la connexion revenue.

---

Bon jeu ! 🎲
