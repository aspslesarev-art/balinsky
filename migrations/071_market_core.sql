-- Ядро аналитики: только то, что известно точно.
--
-- Отсеиваются два класса «не-данных»:
--   1) статус не распознан — непонятно, продан юнит или нет;
--   2) прайс никогда не отмечает проданное (застройщик удаляет ушедшее
--      из таблицы) — «0% продано» там означает отсутствие данных, а не
--      отсутствие спроса.
-- Плюс нужна связь с каталогом, чтобы был известен район.
--
-- Тип продукта в фильтр НЕ входит: у части прайсов вместо типа стоит код
-- планировки («A1-2», «LOT 11»), и требовать тип означало бы выбросить
-- 218 юнитов Elysium из районных и застройщицких срезов, где тип не
-- нужен. Там, где тип важен, запрос сам добавляет
-- `kind in ('villa','apartment')` — таких юнитов 2 431 из 3 026.

create or replace view public.market_core
with (security_invoker = on) as
with live_sources as (
  select source_id from public.market_units where status = 'sold' group by source_id
)
select
  u.id, u.source_id, u.developer, u.complex, u.kind, u.building,
  u.unit_key, u.unit_type, u.bedrooms, u.area_m2, u.land_m2,
  u.status, u.price_usd, u.price_per_m2,
  u.first_seen, u.last_seen, u.sold_at, u.returned_count,
  c.data->>'Location 2'       as district,
  c.data->>'Статус'           as build_status,
  c.data->>'Назначение земли' as land_use,
  c.data->>'SEO:Slug'         as slug
from public.market_units u
join public.market_catalog_links l
  on l.developer = u.developer and l.complex = u.complex
join public.raw_complexes c
  on c.airtable_id = l.catalog_id
where u.status <> 'unknown'
  and u.source_id in (select source_id from live_sources);

grant select on public.market_core to service_role;
