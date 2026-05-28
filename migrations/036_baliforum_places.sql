-- Curated places list from baliforum.ru — Russian-speaking Bali community
-- catalog with ~4 300 entries hand-picked by moderators. Used as a third-party
-- validation signal on the investment map: if a spot is on baliforum, it
-- cleared a curation bar in addition to Google's rating count.
create table if not exists public.baliforum_places (
  slug text primary key,
  name text,
  category text,
  district text,
  lat double precision,
  lng double precision,
  rating real,
  reviews integer,
  google_place_id text,
  address text,
  tags jsonb,
  photo text,
  url text,
  synced_at timestamptz not null default now()
);

-- Same access pattern as raw_*: service_role writes, anon reads.
grant all privileges on table public.baliforum_places to service_role;
grant select on table public.baliforum_places to anon, authenticated;

-- Bounding-box filter is the hot path: snapshot pulls anchors within
-- ~1.5 km of a villa. Plain btree on each axis is enough — Bali fits
-- in <1° on each side so the planner can intersect two range scans
-- without needing PostGIS.
create index if not exists baliforum_places_lat_idx on public.baliforum_places (lat);
create index if not exists baliforum_places_lng_idx on public.baliforum_places (lng);
create index if not exists baliforum_places_category_idx on public.baliforum_places (category);
