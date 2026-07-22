-- ============================================================================
-- Tempo — Script de configuration Supabase
-- À exécuter dans l'éditeur SQL de Supabase (Project > SQL Editor > New query)
-- Peut être exécuté plusieurs fois de suite sans erreur (idempotent).
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- games -----------------------------------------------------------------
-- host_player_id référence players.id, créée sans contrainte de clé
-- étrangère ici car players n'existe pas encore (dépendance circulaire :
-- une partie a un hôte, un joueur appartient à une partie). La contrainte
-- est ajoutée après la création de la table players, plus bas.
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby'
    check (status in ('lobby', 'team_setup', 'in_progress', 'round_summary', 'finished')),
  host_player_id uuid,
  current_round smallint check (current_round in (1, 2)),
  current_player_id uuid,
  current_team text check (current_team in ('blue', 'yellow')),
  turn_duration_seconds smallint not null default 30
    check (turn_duration_seconds in (30, 45, 60)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table games is 'Une partie de Tempo, identifiée par un code court.';

-- players -----------------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 20),
  team text check (team in ('blue', 'yellow')),
  is_host boolean not null default false,
  is_ready boolean not null default false,
  score integer not null default 0 check (score >= 0),
  joined_at timestamptz not null default now(),
  is_connected boolean not null default true
);

comment on table players is 'Un joueur dans une partie donnée (pas de compte, identifiant local).';

-- Ajoute enfin la clé étrangère games.host_player_id -> players.id,
-- maintenant que players existe. ON DELETE SET NULL évite qu'une
-- suppression de joueur ne supprime la partie entière.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'games_host_player_id_fkey'
  ) then
    alter table games
      add constraint games_host_player_id_fkey
      foreign key (host_player_id) references players(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'games_current_player_id_fkey'
  ) then
    alter table games
      add constraint games_current_player_id_fkey
      foreign key (current_player_id) references players(id) on delete set null;
  end if;
end $$;

-- words ---------------------------------------------------------------------
create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 40),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table words is 'Liste de mots à faire deviner, propre à une partie.';

-- Empêche les doublons (insensible à la casse) au sein d'une même partie.
create unique index if not exists words_unique_content_per_game
  on words (game_id, lower(trim(content)));

-- rounds ----------------------------------------------------------------
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  round_number smallint not null check (round_number in (1, 2)),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'finished')),
  blue_team_score integer not null default 0 check (blue_team_score >= 0),
  yellow_team_score integer not null default 0 check (yellow_team_score >= 0),
  started_at timestamptz,
  ended_at timestamptz
);

comment on table rounds is 'Une des 2 manches (Description libre, Un seul mot) d''une partie.';

-- turns -----------------------------------------------------------------
create table if not exists turns (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team text not null check (team in ('blue', 'yellow')),
  score integer not null default 0 check (score >= 0),
  started_at timestamptz,
  ended_at timestamptz
);

comment on table turns is 'Un tour de jeu (un joueur, un chronomètre) au sein d''une manche.';

-- guessed_words -----------------------------------------------------------
create table if not exists guessed_words (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  turn_id uuid not null references turns(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  guessed_at timestamptz not null default now(),
  -- Un mot ne peut être trouvé qu'une seule fois par manche.
  unique (round_id, word_id)
);

comment on table guessed_words is 'Historique des mots trouvés, sert à calculer la pile restante et les stats.';

-- ============================================================================
-- 2. INDEX UTILES
-- ============================================================================

create index if not exists idx_players_game_id on players (game_id);
create index if not exists idx_words_game_id on words (game_id) where is_active;
create index if not exists idx_rounds_game_id on rounds (game_id);
create index if not exists idx_turns_round_id on turns (round_id);
create index if not exists idx_guessed_words_round_id on guessed_words (round_id);
create index if not exists idx_guessed_words_player_id on guessed_words (player_id);
create index if not exists idx_games_code on games (code);

-- ============================================================================
-- 3. FONCTIONS UTILITAIRES
-- ============================================================================

-- Maintient games.updated_at à jour automatiquement.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_games_updated_at on games;
create trigger trg_games_updated_at
  before update on games
  for each row execute function set_updated_at();

-- Empêche de dépasser 4 joueurs par partie (garde-fou en base, en plus de
-- la vérification déjà faite côté serveur dans joinGame()).
create or replace function enforce_max_players()
returns trigger as $$
declare
  player_count integer;
begin
  select count(*) into player_count from players where game_id = new.game_id;
  if player_count >= 4 then
    raise exception 'Une partie est limitée à 4 joueurs.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_max_players on players;
create trigger trg_enforce_max_players
  before insert on players
  for each row execute function enforce_max_players();

-- Vérifie qu'un joueur donné est bien l'hôte d'une partie donnée.
-- Réutilisée par les policies RLS ci-dessous.
create or replace function is_game_host(p_game_id uuid, p_player_id uuid)
returns boolean as $$
  select exists (
    select 1 from games
    where id = p_game_id and host_player_id = p_player_id
  );
$$ language sql stable;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
-- Cette application ne comporte pas de compte utilisateur : la clé "anon"
-- est utilisée à la fois par le navigateur (lecture temps réel) et par les
-- Server Actions Next.js (écritures), qui portent elles-mêmes toute la
-- logique de validation (hôte, nombre de joueurs, doublons...).
-- Les policies ci-dessous sont donc volontairement pragmatiques pour une
-- V1 sans authentification : lecture ouverte (le code de partie à 6
-- caractères joue le rôle de secret partagé), écritures bornées par des
-- contraintes SQL (voir section 3) plutôt que par une identité vérifiée.
-- Une vraie isolation par joueur nécessiterait Supabase Auth (voir README,
-- section "Limites connues").

alter table games enable row level security;
alter table players enable row level security;
alter table words enable row level security;
alter table rounds enable row level security;
alter table turns enable row level security;
alter table guessed_words enable row level security;

-- games : lecture ouverte, écriture ouverte (statuts/valeurs bornés par
-- les contraintes CHECK de la table).
drop policy if exists games_select on games;
create policy games_select on games for select using (true);

drop policy if exists games_insert on games;
create policy games_insert on games for insert with check (true);

drop policy if exists games_update on games;
create policy games_update on games for update using (true) with check (true);

-- players : lecture ouverte. Création possible seulement dans une partie
-- encore en salon d'attente. Mise à jour ouverte (le score n'est modifié
-- que via les Server Actions, jamais directement par l'interface).
drop policy if exists players_select on players;
create policy players_select on players for select using (true);

drop policy if exists players_insert on players;
create policy players_insert on players for insert with check (
  exists (select 1 from games where id = game_id and status = 'lobby')
);

drop policy if exists players_update on players;
create policy players_update on players for update using (true) with check (true);

-- words : lecture ouverte. Écriture réservée aux parties encore en salon
-- (la vérification "seul l'hôte" est faite côté Server Action, qui est le
-- seul point d'entrée exposé à l'interface pour ces opérations).
drop policy if exists words_select on words;
create policy words_select on words for select using (true);

drop policy if exists words_insert on words;
create policy words_insert on words for insert with check (
  exists (select 1 from games where id = game_id and status = 'lobby')
);

drop policy if exists words_delete on words;
create policy words_delete on words for delete using (true);

-- rounds, turns, guessed_words : lecture ouverte, écriture ouverte (ce
-- sont des tables d'état de jeu et d'historique, sans données sensibles).
drop policy if exists rounds_all on rounds;
create policy rounds_select on rounds for select using (true);
create policy rounds_insert on rounds for insert with check (true);
create policy rounds_update on rounds for update using (true) with check (true);
create policy rounds_delete on rounds for delete using (true);

drop policy if exists turns_select on turns;
create policy turns_select on turns for select using (true);
create policy turns_insert on turns for insert with check (true);
create policy turns_update on turns for update using (true) with check (true);
create policy turns_delete on turns for delete using (true);

drop policy if exists guessed_words_select on guessed_words;
create policy guessed_words_select on guessed_words for select using (true);
create policy guessed_words_insert on guessed_words for insert with check (true);
create policy guessed_words_delete on guessed_words for delete using (true);

-- ============================================================================
-- 5. REALTIME
-- ============================================================================
-- Active la réplication logique pour les tables suivies en direct par
-- l'application (voir hooks/useGameRealtime.ts).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'games'
  ) then
    alter publication supabase_realtime add table games;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'words'
  ) then
    alter publication supabase_realtime add table words;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'rounds'
  ) then
    alter publication supabase_realtime add table rounds;
  end if;
end $$;

-- ============================================================================
-- Fin du script.
-- ============================================================================
