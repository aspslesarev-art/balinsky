-- Добавляем в подборку площадь объекта: её просили, чтобы сравнение было
-- объективным.
--
-- ВАЖНО ПРО ДАННЫЕ: источник почти не отдаёт метраж — area_sqm заполнена
-- у 0.0–0.5% объектов по всем типам (виллы 0.1%, отели 0.3%, апартаменты
-- 0.0%). Поле выводится, когда есть, но опираться на него нельзя;
-- реально заполнены спальни (виллы 84%, апартаменты 89%) и тип объекта.
--
-- Набор возвращаемых колонок меняется, поэтому функцию приходится удалять
-- и создавать заново: create or replace на смену OUT-колонок не проходит.
drop function if exists public.booking_data_price_comps(
  double precision, double precision, numeric, numeric, numeric, integer
);

create function public.booking_data_price_comps(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_m   numeric  default 1000,
  p_price_min  numeric  default 0,
  p_price_max  numeric  default 1000000,
  p_limit      integer  default 12
)
returns table(
  id bigint, title text, unit_kind text, bedrooms integer, area_sqm numeric,
  distance_m numeric, occupancy numeric, price numeric, star numeric,
  slug text, image text
)
language sql
stable
as $$
  with cand as (
    select l.id, l.title, c.unit_kind, c.bedrooms, c.area_sqm,
      6371000 * acos(least(1.0,
        cos(radians(p_lat))*cos(radians(l.lat))*cos(radians(l.lng)-radians(p_lng))
        + sin(radians(p_lat))*sin(radians(l.lat)))) as dist,
      l.occupancy, l.price, c.star, c.slug,
      case when c.images like '[%' then (c.images::jsonb ->> 0) end as image
    from public.booking_data_locations l
    join public.booking_data_cards c on c.id = l.id
    where l.lat between p_lat - p_radius_m/111320.0 and p_lat + p_radius_m/111320.0
      and l.lng between p_lng - p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
                    and p_lng + p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
      and l.price is not null
      and l.price between p_price_min and p_price_max
  )
  select id, title, unit_kind, bedrooms, area_sqm, round(dist::numeric, 0),
         occupancy, price, star, slug, image
  from cand
  where dist <= p_radius_m and image is not null
  order by abs(price - (p_price_min + p_price_max)/2), dist
  limit p_limit
$$;

grant execute on function public.booking_data_price_comps(
  double precision, double precision, numeric, numeric, numeric, integer
) to service_role;
