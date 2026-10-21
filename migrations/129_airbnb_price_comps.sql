-- Соседи на Airbnb для ленты «Что рядом сдают за эти же деньги» (рядом с Booking).
--
-- Владелец 21.10.2026: «вывести на сайт, что сдаётся по соседству на Booking и
-- на Airbnb, потом соединить одинаковое». Каталог - airbnb_listings (migrations/120).
-- Цена за ночь - из выдачи поиска: «$999 for 5 nights[, originally $1,200]»;
-- первая сумма - то, что гость платит сейчас (со сборами Airbnb), делим на ночи.
-- Точку Airbnb размывает на ~100-500 м, поэтому расстояние на сайте - «около».
-- Без фото (подробности ещё не собраны) не отдаём: карточка без фото бесполезна.

create index if not exists airbnb_listings_lat_lng on public.airbnb_listings (lat, lng);

create or replace function public.airbnb_night_usd(p text)
returns numeric
language sql
immutable
as $$
  select round(replace(substring(p from '^\$([\d,]+)'), ',', '')::numeric
               / nullif(substring(p from 'for (\d+) nights?')::numeric, 0), 0)
$$;

create or replace function public.airbnb_price_comps(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_m   numeric  default 1000,
  p_price_min  numeric  default 0,
  p_price_max  numeric  default 1000000,
  p_limit      integer  default 24
)
returns table(
  id text, name text, title text, property_type text, room_type text,
  bedrooms integer, guests integer, rating numeric, reviews integer, superhost boolean,
  distance_m numeric, price numeric, photo text
)
language sql
stable
set search_path = public
as $$
  with cand as (
    -- Без l.*: photos/description тяжёлые, их читаем только у отобранных.
    select l.id, l.name, l.title, l.property_type, l.room_type, l.bedrooms, l.guests,
      l.rating, l.reviews, l.superhost, public.airbnb_night_usd(l.search_price) as night,
      6371000 * acos(least(1.0,
        cos(radians(p_lat))*cos(radians(l.lat))*cos(radians(l.lng)-radians(p_lng))
        + sin(radians(p_lat))*sin(radians(l.lat)))) as dist
    from public.airbnb_listings l
    where l.lat between p_lat - p_radius_m/111320.0 and p_lat + p_radius_m/111320.0
      and l.lng between p_lng - p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
                    and p_lng + p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
      and l.n_photos > 0
      -- Пропал из выдачи больше месяца назад - скорее всего снят.
      and l.last_seen >= current_date - 35
  ),
  top as (
    select * from cand c
    where c.dist <= p_radius_m and c.night between p_price_min and p_price_max
    order by abs(c.night - (p_price_min + p_price_max)/2), c.dist
    limit p_limit
  )
  select t.id::text, t.name, t.title, t.property_type, t.room_type,
         t.bedrooms, t.guests, t.rating, t.reviews, t.superhost,
         round(t.dist::numeric, 0), t.night, l.photos -> 0 ->> 'url'
  from top t
  join public.airbnb_listings l on l.id = t.id
  order by abs(t.night - (p_price_min + p_price_max)/2), t.dist
$$;

revoke all on function public.airbnb_price_comps(double precision, double precision, numeric, numeric, numeric, integer) from public, anon, authenticated;
grant execute on function public.airbnb_price_comps(double precision, double precision, numeric, numeric, numeric, integer) to service_role;
