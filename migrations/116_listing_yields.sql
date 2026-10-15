-- Доходность каждого опубликованного объекта, посчитанная тем же расчётом,
-- что и страница объекта (lib/investment/snapshot.ts + computeYieldFacts).
-- Каталог, подборки на главной и консультант берут её отсюда, иначе у них
-- была своя упрощённая формула (60% загрузки, медиана соседей) и цифры
-- расходились со страницей. Пишет scripts/build-listing-yields.ts раз в сутки.
create table if not exists public.listing_yields (
  kind            text not null check (kind in ('villa', 'apartment')),
  airtable_id     text not null,
  mode            text not null check (mode in ('daily', 'monthly')),
  cap_before      numeric,
  cap_resident    numeric,
  cap_nonres      numeric,
  rate_usd        numeric,
  occupancy       numeric,
  occ_source      text,
  computed_at     timestamptz not null default now(),
  primary key (kind, airtable_id)
);
alter table public.listing_yields enable row level security;
revoke all on public.listing_yields from anon, authenticated;
grant select, insert, update, delete on public.listing_yields to service_role;
