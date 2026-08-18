-- Витрины поверх трекера рынка: сколько сейчас в продаже, что ушло за
-- период, как двигались цены.

create or replace view public.market_current_stock
with (security_invoker = on) as
select
  u.developer,
  u.complex,
  count(*) filter (where u.status = 'available') as available,
  count(*) filter (where u.status = 'reserved')  as reserved,
  count(*) filter (where u.status = 'sold')      as sold,
  count(*) filter (where u.status = 'unknown')   as unknown,
  count(*)                                       as total,
  sum(u.price_usd) filter (where u.status = 'available') as available_value_usd,
  avg(u.price_per_m2) filter (where u.status = 'available') as avg_price_per_m2,
  max(u.last_seen) as last_seen
from public.market_units u
group by u.developer, u.complex;

create or replace view public.market_daily_availability
with (security_invoker = on) as
select
  d.d,
  u.developer,
  u.complex,
  count(*) filter (where d.status = 'available') as available,
  count(*) filter (where d.status = 'reserved')  as reserved,
  count(*) filter (where d.status = 'sold')      as sold,
  count(*)                                       as total,
  sum(d.price_usd) filter (where d.status = 'available') as available_value_usd
from public.market_unit_daily d
join public.market_units u on u.id = d.unit_id
group by d.d, u.developer, u.complex;

create or replace view public.market_events_feed
with (security_invoker = on) as
select
  e.d,
  e.kind,
  u.developer,
  u.complex,
  u.unit_key,
  u.unit_type,
  u.bedrooms,
  u.area_m2,
  e.old_status,
  e.new_status,
  e.old_price,
  e.new_price,
  case
    when e.old_price is not null and e.old_price > 0 and e.new_price is not null
    then round(((e.new_price - e.old_price) / e.old_price * 100)::numeric, 1)
  end as price_change_pct,
  e.created_at
from public.market_unit_events e
join public.market_units u on u.id = e.unit_id;

grant select on public.market_current_stock      to service_role;
grant select on public.market_daily_availability to service_role;
grant select on public.market_events_feed        to service_role;
