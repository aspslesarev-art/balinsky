-- Промежуточный уровень между комплексом и юнитом.
--
-- Просилось «здание», но имя корпуса есть только у порталов Unitbox —
-- 18% юнитов; в таблицах, на сайтах и в PDF его нет вовсе. Поэтому
-- группа определяется тем, что данные действительно несут: тип продукта
-- (вилла / апартамент / коммерция), а где корпус известен — корпусом.

alter table public.market_units
  add column if not exists kind text
    check (kind in ('villa','apartment','commercial','unknown')),
  add column if not exists building text;

create index if not exists market_units_kind on public.market_units (kind);
create index if not exists market_units_group on public.market_units (developer, complex, kind);

create or replace view public.market_complexes
with (security_invoker = on) as
select
  u.developer, u.complex,
  count(*) as units,
  count(*) filter (where u.status = 'available') as available,
  count(*) filter (where u.status = 'reserved')  as reserved,
  count(*) filter (where u.status = 'sold')      as sold,
  count(distinct coalesce(u.building, u.kind, 'н/д')) as groups,
  sum(u.price_usd) filter (where u.status = 'available') as available_value_usd,
  avg(u.price_per_m2) filter (where u.status = 'available') as avg_price_per_m2,
  min(u.first_seen) as tracking_since,
  max(u.last_seen)  as last_seen
from public.market_units u
group by u.developer, u.complex;

create or replace view public.market_groups
with (security_invoker = on) as
select
  u.developer, u.complex,
  coalesce(nullif(u.building, ''), u.kind, 'unknown') as group_key,
  u.kind, u.building,
  count(*) as units,
  count(*) filter (where u.status = 'available') as available,
  count(*) filter (where u.status = 'reserved')  as reserved,
  count(*) filter (where u.status = 'sold')      as sold,
  round(100.0 * count(*) filter (where u.status = 'sold')
        / nullif(count(*) filter (where u.status <> 'unknown'), 0), 1) as sold_pct,
  sum(u.price_usd) filter (where u.status = 'available') as available_value_usd,
  avg(u.area_m2)   as avg_area_m2,
  avg(u.price_usd) as avg_price_usd
from public.market_units u
group by u.developer, u.complex, coalesce(nullif(u.building, ''), u.kind, 'unknown'), u.kind, u.building;

grant select on public.market_complexes to service_role;
grant select on public.market_groups    to service_role;
