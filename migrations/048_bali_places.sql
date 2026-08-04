-- 048 — Bali tourism places dataset (documenting an already-live table).
--
-- The table was created in July 2026 straight through the Supabase MCP while
-- collecting the Google Places sweep, so the repo never got a migration file
-- for it. This file is a faithful `if not exists` transcript of what is in
-- production: it is a no-op there and makes a fresh environment reproducible.
--
-- Filled by scripts/collect-bali-tourism.mjs -> scripts/load-bali-tourism-to-db.mjs.
-- Flat columns are for querying; the full Google place object (reviews, photo
-- references, opening hours, amenities) stays in `data`.

create table if not exists public.bali_places (
  id                text primary key,
  name              text,
  primary_type      text,
  types             text[],
  rating            numeric,
  user_rating_count integer,
  price_level       text,
  lat               double precision,
  lng               double precision,
  formatted_address text,
  website           text,
  phone             text,
  editorial         text,
  zones             text[],
  cats              text[],
  review_count      integer,
  photo_count       integer,
  data              jsonb,
  created_at        timestamptz default now()
);

comment on table public.bali_places is
  'Google Places (New) sweep of Bali tourist venues. cats = which search buckets the place surfaced in (not a clean taxonomy — use primary_type/types); zones = sweep anchors it was found near.';

create index if not exists bali_places_cats_idx   on public.bali_places using gin (cats);
create index if not exists bali_places_zones_idx  on public.bali_places using gin (zones);
create index if not exists bali_places_rating_idx on public.bali_places (user_rating_count desc);

alter table public.bali_places enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bali_places' and policyname = 'bali_places_read'
  ) then
    create policy bali_places_read on public.bali_places for select using (true);
  end if;
end $$;

grant select on public.bali_places to anon, authenticated;
grant all    on public.bali_places to service_role;
