-- Медианная загрузка объявлений Booking за всё собранное время (с 05.08.2026),
-- а не за сегодня (просьба владельца 30.10.2026). Нужна «шансу по соседям»
-- на Pro-карточке: сколько из похожих соседей своей реальной ценой ночи и
-- загрузкой дали бы объекту не меньше нижней границы вилки
-- (scripts/build-listing-yields.ts). Фильтры — как в booking_market_occupancy:
-- меньше 30 снимков — мало; застывший календарь — блок хозяина, не брони;
-- ниже 20% — объявление по сути не работает.
create or replace function public.booking_occ_median(p_ids bigint[], p_since date)
returns table(property_id bigint, occupancy numeric, snapshots int)
language sql stable set search_path = public as $$
  with per as (
    select h.property_id,
      percentile_cont(0.5) within group (order by h.occupancy) med,
      avg(h.occupancy) m, count(*) n, count(distinct round(h.occupancy)) dv
    from public.booking_data_history h
    where h.property_id = any(p_ids) and h.snapshot_date >= p_since and h.occupancy is not null
    group by 1
  )
  select property_id, round(med::numeric, 1), n::int from per
  where n >= 30 and not ((dv <= 2 and m >= 80) or (dv <= 3 and m >= 95)) and med >= 20
$$;
grant execute on function public.booking_occ_median(bigint[], date) to service_role;

alter table public.listing_yields
  add column if not exists chance_k smallint,
  add column if not exists chance_n smallint;
