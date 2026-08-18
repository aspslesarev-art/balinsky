-- Трекер рынка застройщиков: реестр прайс-листов, пер-юнитовая история
-- статусов и цен, события (продано / вернулось в продажу / цена
-- изменилась). Живёт рядом с parser_units — те про наполнение каталога
-- сайта через Airtable, эти про аналитику рынка и историю.

create table if not exists public.market_sources (
  id                 bigserial primary key,
  source_key         text not null unique,
  source_kind        text not null check (source_kind in ('google','unitbox','notion','site','pdf')),
  source_url         text not null,
  spreadsheet_id     text,
  gid                text,
  row_no             int,
  developer          text not null,
  complex            text not null,
  unit_types         text,
  active             boolean not null default true,
  layout             jsonb,
  layout_fingerprint text,
  layout_built_at    timestamptz,
  last_scan_at       timestamptz,
  last_status        text check (last_status in ('ok','error','empty')),
  last_error         text,
  last_units         int,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists market_sources_active on public.market_sources (active, last_scan_at nulls first);
create index if not exists market_sources_developer on public.market_sources (developer);

create table if not exists public.market_units (
  id             bigserial primary key,
  source_id      bigint not null references public.market_sources (id) on delete cascade,
  unit_key       text not null,
  developer      text not null,
  complex        text not null,
  unit_type      text,
  bedrooms       int,
  area_m2        numeric,
  land_m2        numeric,
  floor          text,
  status         text not null check (status in ('available','reserved','sold','unknown')),
  price_usd      numeric,
  price_per_m2   numeric,
  first_seen     date not null,
  last_seen      date not null,
  sold_at        date,
  returned_count int not null default 0,
  raw            jsonb,
  updated_at     timestamptz not null default now(),
  unique (source_id, unit_key)
);

create index if not exists market_units_status on public.market_units (status);
create index if not exists market_units_complex on public.market_units (developer, complex);
create index if not exists market_units_last_seen on public.market_units (last_seen);

create table if not exists public.market_unit_daily (
  unit_id    bigint not null references public.market_units (id) on delete cascade,
  d          date not null,
  status     text not null,
  price_usd  numeric,
  primary key (unit_id, d)
);

create index if not exists market_unit_daily_date on public.market_unit_daily (d);

create table if not exists public.market_unit_events (
  id         bigserial primary key,
  unit_id    bigint not null references public.market_units (id) on delete cascade,
  source_id  bigint not null references public.market_sources (id) on delete cascade,
  d          date not null,
  kind       text not null check (kind in ('listed','sold','reserved','returned','price_up','price_down','gone')),
  old_status text,
  new_status text,
  old_price  numeric,
  new_price  numeric,
  created_at timestamptz not null default now()
);

create index if not exists market_unit_events_date on public.market_unit_events (d desc, kind);
create index if not exists market_unit_events_unit on public.market_unit_events (unit_id, d desc);

create table if not exists public.market_scan_runs (
  id             bigserial primary key,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  sources_ok     int not null default 0,
  sources_failed int not null default 0,
  units_seen     int not null default 0,
  events_written int not null default 0,
  note           text
);

alter table public.market_sources     enable row level security;
alter table public.market_units       enable row level security;
alter table public.market_unit_daily  enable row level security;
alter table public.market_unit_events enable row level security;
alter table public.market_scan_runs   enable row level security;

-- Без гранта роль получает тихий permission denied уже в рантайме.
grant all on public.market_sources     to service_role;
grant all on public.market_units       to service_role;
grant all on public.market_unit_daily  to service_role;
grant all on public.market_unit_events to service_role;
grant all on public.market_scan_runs   to service_role;

grant usage, select on sequence public.market_sources_id_seq     to service_role;
grant usage, select on sequence public.market_units_id_seq       to service_role;
grant usage, select on sequence public.market_unit_events_id_seq to service_role;
grant usage, select on sequence public.market_scan_runs_id_seq   to service_role;
