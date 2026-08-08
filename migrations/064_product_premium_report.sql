-- Готовый отчёт «что и где строить» одним JSON-ом.
--
-- Страница /insights/product-premium дёргает это раз в сутки. Считать те же
-- перцентили из приложения нельзя: это десяток тяжёлых сканов по 14k строк
-- и лишний egress на каждый рендер.

create or replace function public.product_premium_report()
returns jsonb
language sql
stable
as $$
with r as (
  select * from public.booking_market_relative
  where stratum_n >= 8 and (vision->>'confidence')::int >= 3
),
-- Признаки продукта: по одной строке на объект и признак.
feat as (
  select 'infinity_pool' k, (vision->>'pool_type' = 'infinity')::int v, adr_ratio from r
  union all select 'pool_any', (vision->>'pool_type' <> 'none')::int, adr_ratio from r
  union all select 'ocean_view', (vision->'views' ?| array['ocean_full','ocean_partial'])::int, adr_ratio from r
  union all select 'nature_view', (vision->'views' ?| array['jungle','river_valley','rice_field'])::int, adr_ratio from r
  union all select 'open_air_living', (vision->'architecture' ? 'open_air_living')::int, adr_ratio from r
  union all select 'thatch', (vision->'materials' ? 'thatch_alang')::int, adr_ratio from r
  union all select 'sala', (vision->'architecture' ? 'sala_gazebo')::int, adr_ratio from r
  union all select 'double_height', (vision->'architecture' ? 'double_height_ceiling')::int, adr_ratio from r
  union all select 'glass_wall', (vision->'architecture' ? 'floor_to_ceiling_glass')::int, adr_ratio from r
  union all select 'microcement', (vision->'materials' ?| array['microcement','terrazzo'])::int, adr_ratio from r
  union all select 'bathtub', (vision->>'bathtub')::boolean::int, adr_ratio from r
  union all select 'outdoor_shower', (vision->>'outdoor_shower')::boolean::int, adr_ratio from r
  union all select 'workspace', (vision->>'workspace_desk')::boolean::int, adr_ratio from r
  union all select 'spacious', (vision->>'space_feel' in ('spacious','grand'))::int, adr_ratio from r
  union all select 'finish_hi', ((vision->>'finish_tier')::int >= 4)::int, adr_ratio from r
  union all select 'bathroom_hi', ((vision->>'bathroom_tier')::int >= 4)::int, adr_ratio from r
  union all select 'kitchen_hi', ((vision->>'kitchen_tier')::int >= 4)::int, adr_ratio from r
),
-- Те же признаки по нашим ЖК — вторая половина сравнения.
ours as (
  select 'infinity_pool' k, (vision->>'pool_type' = 'infinity')::int v from public.catalog_product_zone where kind = 'complex'
  union all select 'pool_any', (vision->>'pool_type' <> 'none')::int from public.catalog_product_zone where kind = 'complex'
  union all select 'ocean_view', (vision->'views' ?| array['ocean_full','ocean_partial'])::int from public.catalog_product_zone where kind = 'complex'
  union all select 'nature_view', (vision->'views' ?| array['jungle','river_valley','rice_field'])::int from public.catalog_product_zone where kind = 'complex'
  union all select 'open_air_living', (vision->'architecture' ? 'open_air_living')::int from public.catalog_product_zone where kind = 'complex'
  union all select 'thatch', (vision->'materials' ? 'thatch_alang')::int from public.catalog_product_zone where kind = 'complex'
  union all select 'sala', (vision->'architecture' ? 'sala_gazebo')::int from public.catalog_product_zone where kind = 'complex'
  union all select 'double_height', (vision->'architecture' ? 'double_height_ceiling')::int from public.catalog_product_zone where kind = 'complex'
  union all select 'glass_wall', (vision->'architecture' ? 'floor_to_ceiling_glass')::int from public.catalog_product_zone where kind = 'complex'
  union all select 'microcement', (vision->'materials' ?| array['microcement','terrazzo'])::int from public.catalog_product_zone where kind = 'complex'
  union all select 'bathtub', (vision->>'bathtub')::boolean::int from public.catalog_product_zone where kind = 'complex'
  union all select 'outdoor_shower', (vision->>'outdoor_shower')::boolean::int from public.catalog_product_zone where kind = 'complex'
  union all select 'workspace', (vision->>'workspace_desk')::boolean::int from public.catalog_product_zone where kind = 'complex'
  union all select 'spacious', (vision->>'space_feel' in ('spacious','grand'))::int from public.catalog_product_zone where kind = 'complex'
  union all select 'finish_hi', ((vision->>'finish_tier')::int >= 4)::int from public.catalog_product_zone where kind = 'complex'
  union all select 'bathroom_hi', ((vision->>'bathroom_tier')::int >= 4)::int from public.catalog_product_zone where kind = 'complex'
  union all select 'kitchen_hi', ((vision->>'kitchen_tier')::int >= 4)::int from public.catalog_product_zone where kind = 'complex'
),
features as (
  select f.k,
         round(percentile_cont(0.5) within group (order by f.adr_ratio) filter (where f.v = 1)::numeric, 2) as premium,
         round(percentile_cont(0.5) within group (order by f.adr_ratio) filter (where f.v = 0)::numeric, 2) as premium_without,
         round(100.0 * avg(f.v)::numeric, 0) as share_market,
         round(100.0 * avg(f.v) filter (where f.adr_ratio >= 1.25)::numeric, 0) as share_top,
         (select round(100.0 * avg(o.v)::numeric, 0) from ours o where o.k = f.k) as share_ours,
         count(*) filter (where f.v = 1) as n
  from feat f
  group by f.k
),
-- Зоны считаем по всем объектам зоны, а не только внутри страт: застройщику
-- нужна картина рынка, а не выборка для регрессии.
zbase as (
  select unit_kind, zone, adr, occupancy, (vision->>'finish_tier')::int as ft
  from public.booking_market_product
  where adr is not null and adr > 0 and occupancy is not null
    and unit_kind in ('villa', 'apartment')
    and (vision->>'confidence')::int >= 3
),
zones as (
  select unit_kind as kind, zone,
         count(*) as n,
         round(percentile_cont(0.5) within group (order by adr)::numeric, 0) as med_adr,
         round(percentile_cont(0.5) within group (order by occupancy)::numeric, 0) as med_occ,
         round(100.0 * avg((ft >= 4)::int)::numeric, 0) as share_hi,
         round(percentile_cont(0.5) within group (order by adr) filter (where ft = 3)::numeric, 0) as adr_t3,
         round(percentile_cont(0.5) within group (order by adr) filter (where ft >= 4)::numeric, 0) as adr_t45
  from zbase
  group by 1, 2
  having count(*) >= 40
),
finish as (
  select (vision->>'finish_tier')::int as tier,
         count(*) as n,
         round(percentile_cont(0.5) within group (order by adr_ratio)::numeric, 2) as adr_idx,
         round(percentile_cont(0.5) within group (order by occ_ratio)::numeric, 2) as occ_idx
  from r group by 1
)
select jsonb_build_object(
  'meta', jsonb_build_object(
    'listings', (select count(*) from public.booking_data_vision),
    'photos',   (select coalesce(sum(photos_used), 0) from public.booking_data_vision)
              + (select coalesce(sum(photos_used), 0) from public.catalog_product_vision),
    'complexes',(select count(*) from public.catalog_product_vision where kind = 'complex'),
    'priced',   (select count(*) from r),
    'updated',  (select max(analyzed_at) from public.booking_data_vision)
  ),
  'features', (select jsonb_agg(to_jsonb(features) order by premium desc nulls last) from features),
  'zones',    (select jsonb_agg(to_jsonb(zones)    order by med_adr desc)           from zones),
  'finish',   (select jsonb_agg(to_jsonb(finish)   order by tier)                   from finish)
)
$$;

grant execute on function public.product_premium_report() to service_role;
