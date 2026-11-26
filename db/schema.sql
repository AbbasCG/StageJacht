-- Stagejacht database (PostgreSQL 14 of nieuwer)
-- Draai dit één keer op een lege database:
--   psql "$DATABASE_URL" -f db/schema.sql      of      npm run db:init
-- Je kunt het veilig opnieuw draaien; bestaande tabellen blijven staan.
--
-- Let op: de app zelf zorgt ervoor dat iedere gebruiker alleen zijn eigen gegevens ziet
-- (zie app/api/db/route.js). Er is dus geen Row Level Security meer nodig.

-- ─── Gebruikers en sessies ────────────────────────────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  naam text,
  google_sub text,
  created_at timestamptz not null default now()
);
create unique index if not exists users_email_uniek on users (lower(email));

create table if not exists sessions (
  token_hash text primary key,                -- sha256 van het cookie; het cookie zelf staat nergens in de database
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_verlopen_idx on sessions (expires_at);

-- ─── Profielen ────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references users (id) on delete cascade,
  naam text,
  opleiding text,
  school text,
  niveau text default '4',
  leerweg text default 'BOL',
  woonplaats text,
  crebocode text,
  telefoon text,
  email text,
  beschikbaar text,
  overmij text,
  sterk text,
  ervaring text,
  stijl text,                                 -- eigen schrijfstijl
  maxafstand int not null default 15 check (maxafstand between 1 and 100),
  cvinfo text,
  cv jsonb default '{"profiel":"","opleidingen":[],"werk":[],"vaardigheden":"","talen":"","hobbys":""}'::jsonb,
  cv_advies jsonb,
  cv_bestand text,                            -- pad van het cv-bestand op schijf (zie UPLOAD_DIR)
  cv_bestandsnaam text,
  onboarding_klaar boolean not null default false,
  -- Alleen de server past deze velden aan
  gmail_verbonden boolean not null default false,
  gmail_adres text,
  plan text not null default 'free' check (plan in ('free','pro','premium')),
  plan_tot timestamptz,
  mollie_customer_id text,
  mollie_subscription_id text,
  mollie_laatste_eerste_betaling text,
  laatste_mailcheck timestamptz,
  laatste_vacaturecheck timestamptz,
  created_at timestamptz not null default now()
);
-- Beheerders: alle functies zonder limieten. Wordt bij elke login door de server gezet op basis van ADMIN_EMAILS.
alter table profiles add column if not exists is_admin boolean not null default false;

-- Profiel automatisch aanmaken bij een nieuwe gebruiker
create or replace function handle_new_user()
returns trigger language plpgsql as $$
begin
  insert into profiles (id, naam, email) values (new.id, new.naam, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_user_created on users;
create trigger on_user_created after insert on users
  for each row execute function handle_new_user();

-- ─── Gmail-tokens (versleuteld; alleen de server leest ze) ─────────────────
create table if not exists gmail_tokens (
  user_id uuid primary key references users (id) on delete cascade,
  refresh_token_enc text not null,
  scopes text,
  updated_at timestamptz not null default now()
);

-- ─── Bedrijven ─────────────────────────────────────────────────────────────
create table if not exists bedrijven (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  naam text not null,
  plaats text,
  link text,
  contact text,
  email text,
  tel text,
  status text not null default 'todo'
    check (status in ('todo','mail','wait','bellen','call','talk','yes','no')),
  datum date,
  opvolg date,
  notes text,
  zoekt text,                                 -- onderzoek: wat het bedrijf doet en zoekt
  reactie_msgid text,
  reactie_threadid text,
  reactie_datum date,
  reactie_soort text check (reactie_soort in ('positief','negatief','neutraal')),
  reactie_samenvatting text,
  advies text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bedrijven_user_idx on bedrijven (user_id);

-- Maximaal 3 bedrijven met het gratis abonnement, afgedwongen in de database
create or replace function check_bedrijven_limiet()
returns trigger language plpgsql as $$
declare
  p record;
  aantal int;
begin
  select plan, plan_tot, is_admin into p from profiles where id = new.user_id;
  if p.is_admin then
    return new;
  end if;
  if p.plan = 'free' or p.plan_tot is null or p.plan_tot < now() then
    select count(*) into aantal from bedrijven where user_id = new.user_id;
    if aantal >= 3 then
      raise exception 'LIMIET_BEDRIJVEN' using hint = 'Met het gratis abonnement kun je 3 bedrijven bijhouden.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists bedrijven_limiet on bedrijven;
create trigger bedrijven_limiet before insert on bedrijven
  for each row execute function check_bedrijven_limiet();

-- ─── Vacatures (gevonden door de zoekassistent) ────────────────────────────
create table if not exists vacatures (
  user_id uuid not null references users (id) on delete cascade,
  id text not null,                           -- Stagemarkt-id
  bedrijf text,
  functie text,
  plaats text,
  contact text,
  email text,
  tel text,
  leerweg text,
  niveau text,
  start text,
  vergoeding text,
  waarom text,
  zoekt text,
  link text,
  bron text,
  afstand_km numeric,
  reistijd text,
  erkend boolean,
  soort text default 'vacature',
  verborgen boolean not null default false,
  toegevoegd boolean not null default false,
  gevonden_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ─── AI-gebruik per maand ──────────────────────────────────────────────────
create table if not exists usage (
  user_id uuid not null references users (id) on delete cascade,
  maand text not null,                        -- 'YYYY-MM'
  ai_acties int not null default 0,
  primary key (user_id, maand)
);

-- Telt een AI-actie op als het binnen de limiet past. Twee tegelijk kan niet door de rij-lock.
create or replace function gebruik_ai(p_user uuid, p_maand text, p_limiet int)
returns boolean language plpgsql as $$
declare
  huidig int;
begin
  insert into usage (user_id, maand, ai_acties) values (p_user, p_maand, 0)
    on conflict (user_id, maand) do nothing;
  select ai_acties into huidig from usage where user_id = p_user and maand = p_maand for update;
  if huidig >= p_limiet then
    return false;
  end if;
  update usage set ai_acties = ai_acties + 1 where user_id = p_user and maand = p_maand;
  return true;
end $$;
