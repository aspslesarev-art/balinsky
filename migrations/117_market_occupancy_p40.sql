-- Загрузка рынка вокруг объекта — 40-й процентиль, а не медиана.
-- Проверка 16.10.2026 на 44 комплексах со своими данными (их объявления из
-- выборки исключены, scripts/yield-check/eval.ts + .tmp-rank/occ-test.ts):
-- медиана завышала на 3 п. (ошибка 6,9 п.), 40-й процентиль — без перекоса,
-- ошибка 4,6 п.; на реальных бронях (BREIG, Maison Boheme) 6,8 → 3,5 п.
-- Соседние 35-й и 45-й дают близкое, то есть это не подгонка под выборку:
-- новый объект в среднем сдаётся чуть хуже середины района, где много
-- раскрученных объявлений с отзывами.
create or replace function public.booking_market_occupancy(
  p_lat double precision, p_lng double precision, p_radius_m numeric,
  p_unit_kind text, p_bedrooms integer, p_since date
) returns table(occupancy numeric, listings integer)
language sql stable as $$
  with comps as (
    select id from public.booking_data_comps(p_lat, p_lng, p_radius_m, p_unit_kind, p_bedrooms, 60)
  ), per as (
    select h.property_id, avg(h.occupancy) m, count(*) n, count(distinct round(h.occupancy)) dv
    from public.booking_data_history h join comps c on c.id = h.property_id
    where h.snapshot_date >= p_since and h.occupancy is not null
    group by 1
  ), ok as (
    select m from per where n >= 30 and not (dv <= 2 and m >= 95) and m >= 20
  )
  select round((percentile_cont(0.4) within group (order by m))::numeric, 2), count(*)::int from ok
$$;
grant execute on function public.booking_market_occupancy(double precision, double precision, numeric, text, integer, date) to service_role;
