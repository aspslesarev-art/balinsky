-- «Что рядом сдают за эти же деньги»: площадь варианта и настоящая загрузка.
--
-- Владелец 21.10.2026: «хочу видеть, что это за объект, площадь относительно
-- моего и загрузку». Было: площадь бралась только с карточки объекта
-- (у Booking почти всегда пусто), а occupancy — метрика estatemarket «дату
-- нельзя забронировать», её виджет не показывал.
--
-- Стало:
--   area_sqm   — площадь выбранного варианта (booking_room_facts.size_m2),
--                иначе площадь с карточки объекта;
--   occ_pct    — загрузка по нашему ежедневному сбору (миграция 096) за
--                последние 30 ночей, те же правила, что /admin/booking:
--                одиночная вилла — сданные ночи из тех, что были открыты
--                (закрытые с самого начала — блок хозяина, не бронь);
--                многономерный объект — 1 − свободно / номеров по снимкам;
--   occ_nights — сколько ночей легло в расчёт (меньше 5 → occ_pct null,
--                по паре ночей процент ничего не значит).
-- Загрузка считается только для короткой выдачи (p_limit ≤ 60, лента
-- виджета): /api/rental-density зовёт эту же функцию с лимитом 500 ради цен,
-- и подзапросы по ночам на 500 объектов упирались в statement timeout.

drop function if exists public.booking_data_price_comps(double precision, double precision, numeric, numeric, numeric, integer);

create function public.booking_data_price_comps(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_m   numeric  default 1000,
  p_price_min  numeric  default 0,
  p_price_max  numeric  default 1000000,
  p_limit      integer  default 12
)
returns table(
  id bigint, title text, unit_kind text, bedrooms integer,
  distance_m numeric, occupancy numeric, price numeric, star numeric,
  slug text, image text, room_type text,
  area_sqm numeric, occ_pct numeric, occ_nights integer
)
language sql
stable
set search_path = public
as $$
  with cand as (
    select l.id, l.title, c.unit_kind, c.bedrooms as card_bedrooms, c.area_sqm as card_area,
      6371000 * acos(least(1.0,
        cos(radians(p_lat))*cos(radians(l.lat))*cos(radians(l.lng)-radians(p_lng))
        + sin(radians(p_lat))*sin(radians(l.lat)))) as dist,
      l.occupancy, l.price as loc_price, c.star, c.slug,
      case when c.images like '[%' then (c.images::jsonb ->> 0) end as image
    from public.booking_data_locations l
    join public.booking_data_cards c on c.id = l.id
    where l.lat between p_lat - p_radius_m/111320.0 and p_lat + p_radius_m/111320.0
      and l.lng between p_lng - p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
                    and p_lng + p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
  ),
  near as (
    select * from cand where dist <= p_radius_m and image is not null
  ),
  room_count as (
    select r.property_id, count(*) as n
    from public.booking_data_rooms r
    where r.property_id in (select id from near) and r.price is not null
    group by r.property_id
  ),
  best_room as (
    select distinct on (r.property_id) r.property_id, r.room_id, r.room_type, r.price
    from public.booking_data_rooms r
    where r.property_id in (select id from near)
      and r.price between p_price_min and p_price_max
    order by r.property_id, abs(r.price - (p_price_min + p_price_max)/2)
  ),
  picked as (
    select n.id, n.title, n.unit_kind, n.dist, n.occupancy, n.star, n.slug, n.image,
      br.room_type,
      coalesce(br.price, n.loc_price) as price,
      case
        when br.property_id is null then n.card_bedrooms
        else coalesce(public.booking_room_bedrooms(br.room_type),
                      case when rc.n = 1 then n.card_bedrooms end)
      end as bedrooms,
      coalesce(f.size_m2, n.card_area) as area_sqm
    from near n
    left join room_count rc on rc.property_id = n.id
    left join best_room br on br.property_id = n.id
    left join public.booking_room_facts f on f.room_id = br.room_id and f.size_m2 > 0
    where (rc.property_id is not null and br.property_id is not null)
       or (rc.property_id is null and n.loc_price between p_price_min and p_price_max)
  ),
  top as (
    select * from picked
    order by abs(price - (p_price_min + p_price_max)/2), dist
    limit p_limit
  ),
  occ as (
    select t.id,
      case when p.mode = 'single' then s.booked::numeric / nullif(s.open_nights, 0)
           else m.occ end as occ,
      case when p.mode = 'single' then s.open_nights else m.snaps end as nights
    from top t
    join public.booking_occ_properties p on p.id = t.id and p_limit <= 60
    left join lateral (
      select count(*) filter (where n.ever_open and not n.last_open) as booked,
             count(*) filter (where n.ever_open) as open_nights
      from public.booking_occ_nights n
      where n.property_id = t.id
        and n.night >= current_date - 30 and n.night < current_date
    ) s on true
    left join lateral (
      select avg(1 - least(r.free_rooms, r.rooms_est)::numeric / nullif(r.rooms_est, 0)) as occ,
             count(*)::int as snaps
      from public.booking_occ_rooms_tonight r
      where r.property_id = t.id and not r.blocked
        and r.run_date >= current_date - 30
    ) m on true
  )
  select t.id, t.title, t.unit_kind, t.bedrooms, round(t.dist::numeric, 0),
         t.occupancy, t.price, t.star, t.slug, t.image, t.room_type,
         round(t.area_sqm, 0),
         case when o.nights >= 5 then round(100 * o.occ, 0) end,
         o.nights::int
  from top t
  left join occ o on o.id = t.id
  order by abs(t.price - (p_price_min + p_price_max)/2), t.dist
$$;

revoke all on function public.booking_data_price_comps(double precision, double precision, numeric, numeric, numeric, integer) from public, anon, authenticated;
grant execute on function public.booking_data_price_comps(double precision, double precision, numeric, numeric, numeric, integer) to service_role;
