-- Booking-сборщик: объект, закрытый на все 60 дней, — это блок хозяина, а не 100% загрузки;
-- объект с минимальным сроком 2+ ночи перепроверяется запросом на этот срок (min_stay).
alter table public.booking_occ_rooms_tonight
  add column if not exists blocked boolean not null default false,
  add column if not exists min_stay int;

create or replace view public.booking_occ_multi_daily as
select t.run_date as night, booking_zone(p.lat, p.lng) as zone, p.unit_kind,
  count(*) as properties,
  sum(t.rooms_est) as rooms,
  sum(t.free_rooms) as free_rooms,
  round(100.0 * (1 - sum(t.free_rooms)::numeric / nullif(sum(t.rooms_est), 0)), 1) as occupancy_pct
from public.booking_occ_rooms_tonight t
join public.booking_occ_properties p on p.id = t.property_id
where not t.blocked
group by 1, 2, 3;
grant select on public.booking_occ_multi_daily to service_role;
