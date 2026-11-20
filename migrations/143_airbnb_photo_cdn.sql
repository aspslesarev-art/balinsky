-- Фото соседей Airbnb — копия первого фото в нашем хранилище (владелец 20.11.2026):
-- картинки Airbnb открываются не везде. Копию кладёт сервер (~/apps/airbnb-occupancy/photos.mjs).
alter table public.airbnb_listings add column if not exists photo_cdn text;

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
         round(t.dist::numeric, 0), t.night, coalesce(l.photo_cdn, l.photos -> 0 ->> 'url')
  from top t
  join public.airbnb_listings l on l.id = t.id
  order by abs(t.night - (p_price_min + p_price_max)/2), t.dist
$$;

revoke all on function public.airbnb_price_comps(double precision, double precision, numeric, numeric, numeric, integer) from public, anon, authenticated;
grant execute on function public.airbnb_price_comps(double precision, double precision, numeric, numeric, numeric, integer) to service_role;

create or replace function public.airbnb_nearby(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_m   numeric  default 2000,
  p_bedrooms   integer  default null,
  p_limit      integer  default 12
)
returns table(
  id text, name text, title text, property_type text,
  bedrooms integer, rating numeric, reviews integer,
  distance_m numeric, price numeric, photo text
)
language sql
stable
set search_path = public
as $$
  with cand as (
    select l.id, l.name, l.title, l.property_type, l.bedrooms, l.rating, l.reviews,
      public.airbnb_night_usd(l.search_price) as night,
      6371000 * acos(least(1.0,
        cos(radians(p_lat))*cos(radians(l.lat))*cos(radians(l.lng)-radians(p_lng))
        + sin(radians(p_lat))*sin(radians(l.lat)))) as dist
    from public.airbnb_listings l
    where l.lat between p_lat - p_radius_m/111320.0 and p_lat + p_radius_m/111320.0
      and l.lng between p_lng - p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
                    and p_lng + p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
      and l.n_photos > 0
      and l.last_seen >= current_date - 35
      -- Поиск собирал только целое жильё; комнаты приходят из подробностей.
      and (l.room_type is null or l.room_type = 'Entire home/apt')
      and (p_bedrooms is null or l.bedrooms = p_bedrooms)
  ),
  top as (
    select * from cand
    where dist <= p_radius_m and night > 0
    order by dist
    limit p_limit
  )
  select t.id::text, t.name, t.title, t.property_type, t.bedrooms, t.rating, t.reviews,
         round(t.dist::numeric, 0), t.night, coalesce(l.photo_cdn, l.photos -> 0 ->> 'url')
  from top t
  join public.airbnb_listings l on l.id = t.id
  order by t.dist
$$;

revoke all on function public.airbnb_nearby(double precision, double precision, numeric, integer, integer) from public, anon, authenticated;
grant execute on function public.airbnb_nearby(double precision, double precision, numeric, integer, integer) to service_role;
