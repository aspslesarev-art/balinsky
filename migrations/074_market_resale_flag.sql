-- Перепродажа против первички.
--
-- Юнит в продаже не обязательно принадлежит застройщику: инвестор мог
-- купить его на стройке и теперь выходить. Для оценки спроса это
-- противоположные вещи — непроданный остаток говорит о слабом спросе, а
-- перепродажа о том, что юнит когда-то успешно продали.
--
-- Признак берётся оттуда, где застройщик называет его сам: у LB Group в
-- легенде генплана есть статус Resale, у порталов Unitbox — поле resale
-- в карточке юнита. У остальных прайсов разделения нет, там перепродажа
-- и остаток выглядят одинаково.

alter table public.market_units
  add column if not exists is_resale boolean not null default false;

create index if not exists market_units_resale on public.market_units (is_resale) where is_resale;

update public.market_units set is_resale = true where raw->>'legendStatus' = 'Resale';

-- Вьюхи пересоздаются: добавить колонку в середину списка через
-- CREATE OR REPLACE Postgres не разрешает.
drop view if exists public.market_rental_yield;
drop view if exists public.market_core;

create view public.market_core
with (security_invoker = on) as
with live_sources as (
  select source_id from public.market_units where status = 'sold' group by source_id
)
select
  u.id, u.source_id, u.developer, u.complex, u.kind, u.building,
  u.unit_key, u.unit_type, u.bedrooms, u.area_m2, u.land_m2,
  u.status, u.is_resale, u.price_usd, u.price_per_m2,
  u.first_seen, u.last_seen, u.sold_at, u.returned_count,
  c.data->>'Location 2'       as district,
  c.data->>'Статус'           as build_status,
  c.data->>'Назначение земли' as land_use,
  c.data->>'SEO:Slug'         as slug
from public.market_units u
join public.market_catalog_links l
  on l.developer = u.developer and l.complex = u.complex
join public.raw_complexes c on c.airtable_id = l.catalog_id
where u.status <> 'unknown'
  and u.source_id in (select source_id from live_sources);

create view public.market_rental_yield
with (security_invoker = on) as
with complexes as (
  select distinct on (mc.developer, mc.complex)
    mc.developer, mc.complex, mc.district,
    nullif(trim(c.data->>'Geo'), '')::float8   as lat,
    nullif(trim(c.data->>'Geo 2'), '')::float8 as lng
  from public.market_core mc
  join public.market_catalog_links l
    on l.developer = mc.developer and l.complex = mc.complex
  join public.raw_complexes c on c.airtable_id = l.catalog_id
  where nullif(trim(c.data->>'Geo'), '') is not null
    and nullif(trim(c.data->>'Geo 2'), '') is not null
),
rent as (
  select cx.developer, cx.complex, cx.district,
    avg(s.median_price)::numeric  as adr,
    avg(s.avg_occupancy)::numeric as occupancy,
    sum(s.objects)::int           as rental_objects
  from complexes cx, lateral public.booking_data_area_stats(cx.lat, cx.lng, 2000) s
  where s.unit_kind = 'villa' and s.objects >= 20
  group by cx.developer, cx.complex, cx.district
),
sale as (
  select developer, complex,
    count(*) as units,
    count(*) filter (where status = 'sold') as sold,
    (percentile_cont(0.5) within group (order by price_usd)
      filter (where price_usd is not null))::numeric as median_price
  from public.market_core where kind = 'villa'
  group by developer, complex
)
select
  r.developer, r.complex, r.district, s.units, s.sold,
  round(100.0 * s.sold / nullif(s.units, 0), 1)   as sold_pct,
  round(s.median_price)                            as villa_price_usd,
  round(r.adr)                                     as adr_usd,
  round(r.occupancy, 1)                            as occupancy_pct,
  round(r.adr * r.occupancy / 100 * 365)           as annual_income_usd,
  round(100.0 * (r.adr * r.occupancy / 100 * 365) / nullif(s.median_price, 0), 1) as gross_yield_pct,
  r.rental_objects
from rent r
join sale s on s.developer = r.developer and s.complex = r.complex;

grant select on public.market_core         to service_role;
grant select on public.market_rental_yield to service_role;
