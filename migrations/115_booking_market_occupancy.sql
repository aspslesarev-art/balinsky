-- Загрузка рынка вокруг объекта: медиана средней загрузки (по дневным снимкам
-- booking_data_history) у 60 ближайших объявлений того же типа и спальности.
-- Закрытые календари (≤2 разных значения и ≥95%) и мёртвые (<20%) не считаем —
-- так же, как lib/investment/snapshot.ts bookingEstimate.
-- Проверено 16.10.2026 на 39 комплексах со своими объявлениями: ошибка
-- 6,5 п. против 22 п. у прежних «60% для всех».
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
  select round((percentile_cont(0.5) within group (order by m))::numeric, 2), count(*)::int from ok
$$;
grant execute on function public.booking_market_occupancy(double precision, double precision, numeric, text, integer, date) to service_role;
