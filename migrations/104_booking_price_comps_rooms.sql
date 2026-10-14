-- «Что рядом сдают за эти же деньги»: сравнивать с конкретным вариантом
-- жилья, а не с объектом Booking целиком.
--
-- Было: цена — минимальная по объекту (booking_data_locations.price, самый
-- дешёвый вариант), спальни — с карточки (booking_data_cards.bedrooms,
-- самый большой вариант). У комплекса с однушкой за $80 и трёхспальной
-- виллой за $267 выходило «вилла, 3 спальни, $77» — такого жилья нет
-- (Alam Ubud Culture Villas, жалоба владельца 14.10.2026).
--
-- Стало: если у объекта есть варианты (booking_data_rooms), берём тот, чья
-- цена ближе всего к середине коридора, и отдаём его название, цену и спальни
-- из названия («One-Bedroom Villa» → 1). Нет числа в названии — спальни
-- только если вариант у объекта единственный (тогда карточка про него).
-- Объекты без вариантов — как раньше.

create or replace function public.booking_room_bedrooms(p_room_type text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case lower((regexp_match(coalesce(p_room_type, ''),
                     '(one|two|three|four|five|six|seven|eight|nine|ten|\d+)[- ]?bed ?room', 'i'))[1])
    when 'one' then 1 when 'two' then 2 when 'three' then 3 when 'four' then 4
    when 'five' then 5 when 'six' then 6 when 'seven' then 7 when 'eight' then 8
    when 'nine' then 9 when 'ten' then 10
    else (regexp_match(coalesce(p_room_type, ''), '(\d+)[- ]?bed ?room', 'i'))[1]::integer
  end
$$;

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
  slug text, image text, room_type text
)
language sql
stable
set search_path = public
as $$
  with cand as (
    select l.id, l.title, c.unit_kind, c.bedrooms as card_bedrooms,
      6371000 * acos(least(1.0,
        cos(radians(p_lat))*cos(radians(l.lat))*cos(radians(l.lng)-radians(p_lng))
        + sin(radians(p_lat))*sin(radians(l.lat)))) as dist,
      l.occupancy, l.price as loc_price, c.star, c.slug,
      -- images хранится текстом; невалидный JSON в приведении уронил бы
      -- запрос, поэтому кастуем только то, что начинается со скобки.
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
    select distinct on (r.property_id) r.property_id, r.room_type, r.price
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
      end as bedrooms
    from near n
    left join room_count rc on rc.property_id = n.id
    left join best_room br on br.property_id = n.id
    -- Есть варианты — нужен хотя бы один в коридоре; нет вариантов — по цене объекта.
    where (rc.property_id is not null and br.property_id is not null)
       or (rc.property_id is null and n.loc_price between p_price_min and p_price_max)
  )
  select id, title, unit_kind, bedrooms, round(dist::numeric, 0),
         occupancy, price, star, slug, image, room_type
  from picked
  -- Сначала те, чья цена ближе к запрошенной, при равенстве — ближе по карте.
  order by abs(price - (p_price_min + p_price_max)/2), dist
  limit p_limit
$$;

revoke all on function public.booking_data_price_comps(double precision, double precision, numeric, numeric, numeric, integer) from public, anon, authenticated;
grant execute on function public.booking_data_price_comps(double precision, double precision, numeric, numeric, numeric, integer) to service_role;
revoke all on function public.booking_room_bedrooms(text) from public, anon, authenticated;
grant execute on function public.booking_room_bedrooms(text) to service_role;
