-- Загрузка соседа: период и согласованность.
--
-- Владелец 21.10.2026: «у Vinaya занято 3% - за какой срок? ошибка».
-- Разбор: occupancy варианта у estatemarket - доля ночей ~за месяц, когда
-- этот вариант нельзя было забронировать (знаменатель 31 ночь у 1 180 из
-- 3 000 проверенных значений, ещё 203 - 62 ночи). У Vinaya 4 отдельных
-- «Double Room»: три закрыты 1 ночь из 28-30, один - весь месяц. А
-- occupancy объекта (booking_data_locations, 79%) с вариантами не сходится,
-- и как он считается - неизвестно (наш сбор дал ~20%).
-- Поэтому загрузку объекта считаем сами тем же способом: средняя по
-- вариантам, взвешенная по их количеству (max_available); нет вариантов -
-- старая цифра estatemarket.

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
  slug text, image text, room_type text,
  area_sqm numeric, room_photo text, room_occ numeric,
  n_villas integer, n_apts integer, n_rooms integer
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
    select distinct on (r.property_id) r.property_id, r.room_id, r.room_type, r.price, r.occupancy
    from public.booking_data_rooms r
    where r.property_id in (select id from near)
      and r.price between p_price_min and p_price_max
    order by r.property_id, abs(r.price - (p_price_min + p_price_max)/2)
  ),
  picked as (
    select n.id, n.title, n.unit_kind, n.dist, n.occupancy, n.star, n.slug, n.image,
      br.room_type, f.photos[1] as room_photo, br.occupancy as room_occ,
      coalesce(br.price, n.loc_price) as price,
      case
        when br.property_id is null then n.card_bedrooms
        else coalesce(public.booking_room_bedrooms(br.room_type),
                      case when rc.n = 1 then n.card_bedrooms end)
      end as bedrooms,
      coalesce(public.booking_plausible_area(f.size_m2, br.room_type, n.unit_kind),
               public.booking_plausible_area(n.card_area, br.room_type, n.unit_kind)) as area_sqm
    from near n
    left join room_count rc on rc.property_id = n.id
    left join best_room br on br.property_id = n.id
    left join public.booking_room_facts f on f.room_id = br.room_id
    where (rc.property_id is not null and br.property_id is not null)
       or (rc.property_id is null and n.loc_price between p_price_min and p_price_max)
  ),
  top as (
    select * from picked
    order by abs(price - (p_price_min + p_price_max)/2), dist
    limit p_limit
  ),
  mix as (
    select t.id,
      sum(r.occupancy * greatest(coalesce(r.max_available, 1), 1)) filter (where r.occupancy is not null)
        / nullif(sum(greatest(coalesce(r.max_available, 1), 1)) filter (where r.occupancy is not null), 0) as occ,
      sum(greatest(coalesce(r.max_available, 1), 1)) filter (where public.booking_room_kind(r.room_type, t.unit_kind) = 'villa')::int as n_villas,
      sum(greatest(coalesce(r.max_available, 1), 1)) filter (where public.booking_room_kind(r.room_type, t.unit_kind) = 'apt')::int as n_apts,
      sum(greatest(coalesce(r.max_available, 1), 1)) filter (where public.booking_room_kind(r.room_type, t.unit_kind) = 'room')::int as n_rooms
    from top t
    join public.booking_data_rooms r on r.property_id = t.id
    -- /api/rental-density зовёт функцию с лимитом 500 ради одних цен.
    where p_limit <= 60
    group by t.id
  )
  select t.id, t.title, t.unit_kind, t.bedrooms, round(t.dist::numeric, 0),
         round(coalesce(x.occ, t.occupancy), 1), t.price, t.star, t.slug, t.image, t.room_type,
         round(t.area_sqm, 0), t.room_photo, t.room_occ,
         x.n_villas, x.n_apts, x.n_rooms
  from top t
  left join mix x on x.id = t.id
  order by abs(t.price - (p_price_min + p_price_max)/2), t.dist
$$;

revoke all on function public.booking_data_price_comps(double precision, double precision, numeric, numeric, numeric, integer) from public, anon, authenticated;
grant execute on function public.booking_data_price_comps(double precision, double precision, numeric, numeric, numeric, integer) to service_role;

create or replace function public.booking_slug_facts(p_slugs text[], p_bedrooms integer[])
returns table(
  slug text, unit_kind text,
  n_villas integer, n_apts integer, n_rooms integer,
  room_type text, room_photo text, room_area numeric, room_occ numeric,
  occ numeric
)
language sql
stable
set search_path = public
as $$
  with req as (
    select s as slug, b as bedrooms
    from unnest(p_slugs, p_bedrooms) as u(s, b)
  ),
  prop as (
    select distinct on (r.slug) r.slug, r.bedrooms, c.id, c.unit_kind, l.occupancy
    from req r
    join public.booking_data_cards c on c.slug = r.slug
    left join public.booking_data_locations l on l.id = c.id
    order by r.slug, c.id
  ),
  mix as (
    select pr.slug,
      sum(r.occupancy * greatest(coalesce(r.max_available, 1), 1)) filter (where r.occupancy is not null)
        / nullif(sum(greatest(coalesce(r.max_available, 1), 1)) filter (where r.occupancy is not null), 0) as occ,
      sum(greatest(coalesce(r.max_available, 1), 1)) filter (where public.booking_room_kind(r.room_type, pr.unit_kind) = 'villa')::int as n_villas,
      sum(greatest(coalesce(r.max_available, 1), 1)) filter (where public.booking_room_kind(r.room_type, pr.unit_kind) = 'apt')::int as n_apts,
      sum(greatest(coalesce(r.max_available, 1), 1)) filter (where public.booking_room_kind(r.room_type, pr.unit_kind) = 'room')::int as n_rooms
    from prop pr
    join public.booking_data_rooms r on r.property_id = pr.id
    group by pr.slug
  ),
  -- Вариант с тем же числом спален, что у карточки; из нескольких - с фото.
  room as (
    select distinct on (pr.slug) pr.slug, r.room_type, f.photos[1] as photo,
      public.booking_plausible_area(f.size_m2, r.room_type, pr.unit_kind) as area, r.occupancy
    from prop pr
    join public.booking_data_rooms r on r.property_id = pr.id
    left join public.booking_room_facts f on f.room_id = r.room_id
    where pr.bedrooms is not null and public.booking_room_bedrooms(r.room_type) = pr.bedrooms
    order by pr.slug, (f.photos[1] is null), r.price nulls last
  )
  select pr.slug, pr.unit_kind,
         x.n_villas, x.n_apts, x.n_rooms,
         rm.room_type, rm.photo, rm.area, rm.occupancy,
         round(coalesce(x.occ, pr.occupancy), 1)
  from prop pr
  left join mix x on x.slug = pr.slug
  left join room rm on rm.slug = pr.slug
$$;

revoke all on function public.booking_slug_facts(text[], integer[]) from public, anon, authenticated;
grant execute on function public.booking_slug_facts(text[], integer[]) to service_role;
revoke all on function public.booking_room_kind(text, text) from public, anon, authenticated;
grant execute on function public.booking_room_kind(text, text) to service_role;
