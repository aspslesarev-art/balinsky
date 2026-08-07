-- «Что рядом сдают за эти же деньги»: подбор объектов Booking по ценовому
-- диапазону вокруг ADR, который посетитель выставил ползунком.
--
-- Отличие от соседней booking_data_comps: та ищет прямых конкурентов по типу
-- и числу спален и цену не фильтрует. Здесь наоборот — сегмент не важен,
-- важна цена за ночь и наличие фотографии, потому что блок отвечает на
-- вопрос «что вообще можно снять за эти деньги рядом».
--
-- Геометрия расстояния и рамка предфильтра по широте/долготе повторяют
-- booking_data_comps намеренно: одна и та же математика на обоих экранах.
create or replace function public.booking_data_price_comps(
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
  slug text, image text
)
language sql
stable
as $$
  with cand as (
    select l.id, l.title, c.unit_kind, c.bedrooms,
      6371000 * acos(least(1.0,
        cos(radians(p_lat))*cos(radians(l.lat))*cos(radians(l.lng)-radians(p_lng))
        + sin(radians(p_lat))*sin(radians(l.lat)))) as dist,
      l.occupancy, l.price, c.star, c.slug,
      -- images хранится текстом; невалидный JSON в приведении уронил бы
      -- запрос, поэтому кастуем только то, что начинается со скобки.
      case when c.images like '[%' then (c.images::jsonb ->> 0) end as image
    from public.booking_data_locations l
    join public.booking_data_cards c on c.id = l.id
    where l.lat between p_lat - p_radius_m/111320.0 and p_lat + p_radius_m/111320.0
      and l.lng between p_lng - p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
                    and p_lng + p_radius_m/(111320.0*greatest(0.1, cos(radians(p_lat))))
      and l.price is not null
      and l.price between p_price_min and p_price_max
  )
  select id, title, unit_kind, bedrooms, round(dist::numeric, 0),
         occupancy, price, star, slug, image
  from cand
  where dist <= p_radius_m and image is not null
  -- Сначала те, чья цена ближе к запрошенной, при равенстве — ближе по карте.
  order by abs(price - (p_price_min + p_price_max)/2), dist
  limit p_limit
$$;

grant execute on function public.booking_data_price_comps(
  double precision, double precision, numeric, numeric, numeric, integer
) to service_role;
