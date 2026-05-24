-- Per-complex price-list parser config. Mirrors the visualizations
-- workflow (one row per ЖК → editor at /admin/parsers/<complex_id>).
-- The actual sync target — Airtable «Юниты Виллы» / «Юниты Апартаменты»
-- — is determined by parser_type; the row stores only what the
-- engine needs to fetch and the last-run audit trail.

create table if not exists public.complex_parsers (
  complex_id text primary key,
  source_url text not null,
  -- bali_baza  → BALI BAZA Google Sheets price list, BAZA-specific schema
  -- generic_gsheet → unsupported yet, surfaces in admin as "scheduled"
  -- manual_csv → editor pastes CSV by hand
  parser_type text not null default 'bali_baza',
  last_run_at timestamptz,
  last_status text,                  -- 'ok' | 'error' | null
  last_error text,
  last_units_count integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists complex_parsers_status_idx on public.complex_parsers (last_status, last_run_at desc);

grant all privileges on table public.complex_parsers to service_role;
grant select on table public.complex_parsers to anon, authenticated;
