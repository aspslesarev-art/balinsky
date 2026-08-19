-- Связь трекера рынка с каталогом сайта.
--
-- Прайсы дают цену и статус, но ничего не знают о районе, стадии стройки
-- и о том, как объект показан на сайте. Всё это есть в raw_complexes, и
-- комплексы сопоставляются по названию: из 93 комплексов трекера связаны
-- 88 — 85 по паре «название + застройщик», 3 по одному названию.
--
-- Связь вынесена в отдельную таблицу, а не в market_sources: имя
-- комплекса может измениться в любой из двух систем, и тогда правится
-- одна строка сопоставления, а не данные.

create table if not exists public.market_catalog_links (
  developer    text not null,
  complex      text not null,
  catalog_id   text not null,
  confidence   text not null check (confidence in ('name_and_developer','name_only','manual')),
  linked_at    timestamptz not null default now(),
  primary key (developer, complex)
);

create index if not exists market_catalog_links_catalog on public.market_catalog_links (catalog_id);

create or replace view public.market_complex_catalog
with (security_invoker = on) as
select
  mc.developer, mc.complex, mc.units, mc.available, mc.reserved, mc.sold,
  mc.available_value_usd, mc.tracking_since,
  l.catalog_id, l.confidence,
  c.data->>'Project'          as catalog_project,
  c.data->>'Location 2'       as district,
  c.data->>'Location'         as location,
  c.data->>'Статус'           as build_status,
  c.data->>'Назначение земли' as land_use,
  c.data->>'SEO:Slug'         as slug,
  c.data->>'Geo 2'            as geo,
  c.data->>'Главное фото'     as main_photo
from public.market_complexes mc
left join public.market_catalog_links l
  on l.developer = mc.developer and l.complex = mc.complex
left join public.raw_complexes c on c.airtable_id = l.catalog_id;

alter table public.market_catalog_links enable row level security;
grant all    on public.market_catalog_links   to service_role;
grant select on public.market_complex_catalog to service_role;
