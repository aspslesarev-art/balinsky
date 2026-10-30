-- Pro-карточка каталога: доход «от и до» и вероятность (макет «Pro: доход от
-- и до + вероятность», 30.10.2026). Вилка — плохой и хороший год из того же
-- расчёта, что таблица сценариев на странице объекта (yieldScenarios в
-- lib/listing-verdict.ts); вероятность и её причины считает
-- lib/investment/chance.ts. Пишет scripts/build-listing-yields.ts.
alter table public.listing_yields
  add column if not exists cap_low    numeric,
  add column if not exists cap_high   numeric,
  add column if not exists chance     smallint,
  add column if not exists factors    jsonb,
  add column if not exists complex_id text,
  -- Цена входа (объект + оформление + мебель), $: доход в деньгах = доля × она.
  add column if not exists entry_usd  numeric;

create index if not exists listing_yields_complex on public.listing_yields (complex_id);

-- Вид из объекта: по фото и рельефу. Пустая, пока не размечена; причина
-- «вид» в вероятности появляется только у размеченных объектов.
--   view: jungle | ocean_full | ocean_partial | rice_field | cliff | mountain |
--         river_valley | city | garden | none
create table if not exists public.listing_views (
  kind        text not null check (kind in ('villa', 'apartment')),
  airtable_id text not null,
  view        text not null,
  source      text not null,          -- photos | relief | manual
  note        text,
  rated_at    timestamptz not null default now(),
  primary key (kind, airtable_id)
);
alter table public.listing_views enable row level security;
revoke all on public.listing_views from anon, authenticated;
grant select, insert, update, delete on public.listing_views to service_role;
