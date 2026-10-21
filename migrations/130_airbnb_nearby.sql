-- Соседи на Airbnb для вкладки «Будет ли спрос? → Посуточно» (рядом с Booking).
--
-- Владелец 21.10.2026: во вкладке видно, что сдаётся на Booking, а на Airbnb —
-- нет. Здесь не коридор цены (это migrations/129 для калькулятора), а
-- похожие по спальням: целое жильё с тем же числом спален в радиусе,
-- ближайшие первыми. Цена за ночь — airbnb_night_usd (со сборами Airbnb).

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
         round(t.dist::numeric, 0), t.night, l.photos -> 0 ->> 'url'
  from top t
  join public.airbnb_listings l on l.id = t.id
  order by t.dist
$$;

revoke all on function public.airbnb_nearby(double precision, double precision, numeric, integer, integer) from public, anon, authenticated;
grant execute on function public.airbnb_nearby(double precision, double precision, numeric, integer, integer) to service_role;
