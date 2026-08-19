-- Доходность аренды рядом с каждым комплексом.
--
-- Соединяет две половины базы, которые жили порознь: прайсы застройщиков
-- (сколько стоит купить) и рынок посуточной аренды, 27 714 объектов
-- (сколько можно заработать). Для комплекса берётся окрестность 2 км и
-- считается медианный тариф и загрузка сопоставимого жилья.
--
-- Доходность ВАЛОВАЯ: тариф × загрузка × 365 / цена покупки. Управление,
-- обслуживание, налоги и простои между гостями не вычтены — это верхняя
-- граница, а не то, что получит владелец.

create or replace view public.market_rental_yield
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
  from complexes cx,
       lateral public.booking_data_area_stats(cx.lat, cx.lng, 2000) s
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
  r.developer, r.complex, r.district,
  s.units, s.sold,
  round(100.0 * s.sold / nullif(s.units, 0), 1)   as sold_pct,
  round(s.median_price)                            as villa_price_usd,
  round(r.adr)                                     as adr_usd,
  round(r.occupancy, 1)                            as occupancy_pct,
  round(r.adr * r.occupancy / 100 * 365)           as annual_income_usd,
  round(100.0 * (r.adr * r.occupancy / 100 * 365) / nullif(s.median_price, 0), 1) as gross_yield_pct,
  r.rental_objects
from rent r
join sale s on s.developer = r.developer and s.complex = r.complex;

grant select on public.market_rental_yield to service_role;
