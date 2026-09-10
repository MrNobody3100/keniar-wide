-- ============================================================
-- EURL Keniar Wide — Schéma de base de données Supabase
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Catégories
-- ------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  icon text not null default 'shapes',       -- nom d'icône Phosphor (ex: 'video-camera')
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. Produits (catalogue + stock)
-- ------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  name text not null,
  description text,
  category_id uuid references categories(id) on delete restrict,
  tech text not null check (tech in ('ip', 'analogique', 'sans-fil')),
  price numeric(12,2) not null default 0,
  stock integer not null default 0,
  availability text not null default 'en-stock'
    check (availability in ('en-stock', 'sur-commande', 'rupture')),
  image_url text,                             -- URL Vercel Blob de la photo
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category_id);

-- ------------------------------------------------------------
-- 3. Réalisations (portfolio de projets)
-- ------------------------------------------------------------
create table if not exists realisations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client text,
  category_id uuid references categories(id) on delete set null,
  location text,
  year integer,
  description text,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_realisations_category on realisations(category_id);

-- ------------------------------------------------------------
-- 4. Demandes de devis (configurateur "Devis sur Mesure")
-- ------------------------------------------------------------
create table if not exists devis_requests (
  id uuid primary key default gen_random_uuid(),
  nom text,
  telephone text,
  typologie text check (typologie in ('residentiel', 'commercial', 'industriel')),
  surface integer,
  acces integer,
  equipements uuid[],                          -- tableau d'IDs de catégories cochées
  adresse text,
  visite text check (visite in ('oui', 'non')),
  status text not null default 'nouveau'
    check (status in ('nouveau', 'en-cours', 'traite')),
  created_at timestamptz not null default now()
);

create index if not exists idx_devis_status on devis_requests(status);

-- ------------------------------------------------------------
-- 5. Messages de contact
-- ------------------------------------------------------------
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  nom text,
  email text,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_read on contact_messages(read);

-- ------------------------------------------------------------
-- 6. Catégories par défaut (celles déjà utilisées sur le site)
-- ------------------------------------------------------------
insert into categories (label, icon) values
  ('Caméras CCTV & NVR', 'video-camera'),
  ('Centrales d''Alarme', 'bell-ringing'),
  ('Interphonie & Contrôle d''accès', 'door-open'),
  ('Sécurité Incendie SSI', 'fire-extinguisher')
on conflict do nothing;

-- ------------------------------------------------------------
-- 7. Row Level Security (RLS)
-- ------------------------------------------------------------
-- Lecture publique : catalogue, catégories, réalisations
-- (le site public en a besoin, sans être connecté)
alter table categories enable row level security;
alter table products enable row level security;
alter table realisations enable row level security;
alter table devis_requests enable row level security;
alter table contact_messages enable row level security;

create policy "Public read categories" on categories
  for select using (true);

create policy "Public read products" on products
  for select using (true);

create policy "Public read realisations" on realisations
  for select using (true);

-- Écriture publique UNIQUEMENT pour créer une demande/un message
-- (un client anonyme doit pouvoir soumettre le formulaire)
create policy "Public insert devis" on devis_requests
  for insert with check (true);

create policy "Public insert messages" on contact_messages
  for insert with check (true);

-- ⚠️ TEMPORAIRE : policies admin permissives (voir note ci-dessous)
create policy "Admin manage categories" on categories
  for all using (true) with check (true);

create policy "Admin manage products" on products
  for all using (true) with check (true);

create policy "Admin manage realisations" on realisations
  for all using (true) with check (true);

create policy "Admin read/update devis" on devis_requests
  for select using (true);
create policy "Admin update devis" on devis_requests
  for update using (true) with check (true);
create policy "Admin delete devis" on devis_requests
  for delete using (true);

create policy "Admin read messages" on contact_messages
  for select using (true);
create policy "Admin update messages" on contact_messages
  for update using (true) with check (true);
create policy "Admin delete messages" on contact_messages
  for delete using (true);

-- ============================================================
-- ⚠️ IMPORTANT — À lire avant la mise en production :
--
-- Les policies "Admin ..." ci-dessus sont volontairement ouvertes
-- (using (true)) car l'admin n'a pas encore de vraie authentification
-- Supabase — juste un login codé en dur côté JS. Ça veut dire que,
-- techniquement, n'importe qui connaissant ta clé "anon" pourrait
-- lire/modifier/supprimer produits, catégories, réalisations et devis.
--
-- Prochaine étape à faire avant la mise en ligne réelle : brancher
-- Supabase Auth sur admin/login.html, puis remplacer ces policies par
-- des règles du type : using (auth.role() = 'authenticated').
-- ============================================================
