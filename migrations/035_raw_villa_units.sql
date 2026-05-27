-- Sync target for the «Юниты Виллы» table in Airtable base
-- appPrMGM6h24IekkS / tblfyveBxB1yJbR7d. Mirrors the raw_villas /
-- raw_apartments shape so the catalog code can read JSONB by
-- airtable_id without case-by-case casts.
create table if not exists public.raw_villa_units (
  airtable_id text primary key,
  data jsonb not null,
  synced_at timestamptz not null default now()
);

-- Same access pattern as raw_villas: service_role writes via the
-- sync script, anon reads JSONB blobs server-side.
grant all privileges on table public.raw_villa_units to service_role;
grant select on table public.raw_villa_units to anon, authenticated;

-- Listing pages typically filter by complex slug or by parent villa
-- airtable_id (the link from a unit to its planning Villa record).
-- A GIN index on the JSONB makes those LIKE / containment queries
-- not table-scan once we cross ~100 units.
create index if not exists raw_villa_units_data_gin on public.raw_villa_units using gin (data);
