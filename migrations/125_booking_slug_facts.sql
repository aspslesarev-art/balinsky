-- «Будет ли спрос? → Посуточно»: что за объект у соседа на Booking.
--
-- Владелец 21.10.2026: если на карточке фото комплекса, показать, какая это
-- вилла и что за комплекс - сколько там вилл и апартаментов, и загрузку.
-- Карточки блока приходят из манифеста конкурентов (ссылка на Booking со
-- slug), поэтому связываем по slug с booking_data_* и нашим сбором загрузки.
--
-- На каждый slug (+ число спален карточки):
--   n_villas / n_apts / n_rooms — состав по вариантам booking_data_rooms:
--       сумма max_available (оценка снизу: estatemarket режет запас на 10);
--   room_type, room_occ_pct — вариант с тем же числом спален и его загрузка
--       по снимкам by_room (1 − свободно / запас); нет в снимке = 0 свободных;
--   occ_pct, occ_nights — загрузка всего объекта за 30 ночей, правила
--       /admin/booking (одиночная вилла: сданные из открытых ночей;
--       многономерный: 1 − свободно / номеров). Меньше 5 ночей → null.

create or replace function public.booking_slug_facts(p_slugs text[], p_bedrooms integer[])
returns table(
  slug text, unit_kind text, mode text,
  n_villas integer, n_apts integer, n_rooms integer,
  room_type text, room_occ_pct numeric,
  occ_pct numeric, occ_nights integer
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
    select distinct on (r.slug) r.slug, r.bedrooms, c.id, c.unit_kind, p.mode
    from req r
    join public.booking_data_cards c on c.slug = r.slug
    left join public.booking_occ_properties p on p.id = c.id
    order by r.slug, c.id
  ),
  mix as (
    -- Тип варианта по названию; без подсказки в названии («One Bedroom
    -- Wooden with Private Pool») - по типу самого объекта: у виллы это вилла.
    select pr.slug,
      sum(greatest(coalesce(r.max_available, 1), 1)) filter (where k.kind = 'villa')::int as n_villas,
      sum(greatest(coalesce(r.max_available, 1), 1)) filter (where k.kind = 'apt')::int as n_apts,
      sum(greatest(coalesce(r.max_available, 1), 1)) filter (where k.kind = 'room')::int as n_rooms
    from prop pr
    join public.booking_data_rooms r on r.property_id = pr.id
    cross join lateral (
      select case
        when r.room_type ~* 'villa|house|bungalow|cottage|joglo|chalet|home' then 'villa'
        when r.room_type ~* 'apartment|studio|loft|flat' then 'apt'
        when pr.unit_kind in ('villa', 'house') then 'villa'
        else 'room'
      end as kind
    ) k
    group by pr.slug
  ),
  room as (
    select distinct on (pr.slug) pr.slug, r.room_id, r.room_type, r.max_available
    from prop pr
    join public.booking_data_rooms r on r.property_id = pr.id
    where pr.bedrooms is not null and public.booking_room_bedrooms(r.room_type) = pr.bedrooms
    order by pr.slug, r.price nulls last
  ),
  occ as (
    select pr.slug,
      case when pr.mode = 'single' then s.booked::numeric / nullif(s.open_nights, 0) else m.occ end as occ,
      case when pr.mode = 'single' then s.open_nights else m.snaps end as nights,
      ro.occ as room_occ, ro.snaps as room_snaps
    from prop pr
    left join room rm on rm.slug = pr.slug
    left join lateral (
      select count(*) filter (where n.ever_open and not n.last_open) as booked,
             count(*) filter (where n.ever_open) as open_nights
      from public.booking_occ_nights n
      where pr.mode = 'single' and n.property_id = pr.id
        and n.night >= current_date - 30 and n.night < current_date
    ) s on true
    left join lateral (
      select avg(1 - least(r.free_rooms, r.rooms_est)::numeric / nullif(r.rooms_est, 0)) as occ,
             count(*)::int as snaps
      from public.booking_occ_rooms_tonight r
      where pr.mode = 'multi' and r.property_id = pr.id and not r.blocked
        and r.run_date >= current_date - 30
    ) m on true
    left join lateral (
      select 1 - avg(coalesce((r.by_room ->> rm.room_id::text)::numeric, 0))
               / nullif(greatest(rm.max_available, max(coalesce((r.by_room ->> rm.room_id::text)::numeric, 0))), 0) as occ,
             count(*)::int as snaps
      from public.booking_occ_rooms_tonight r
      where pr.mode = 'multi' and rm.room_id is not null
        and r.property_id = pr.id and not r.blocked
        and r.run_date >= current_date - 30
    ) ro on true
  )
  select pr.slug, pr.unit_kind, pr.mode,
         x.n_villas, x.n_apts, x.n_rooms,
         rm.room_type,
         case when o.room_snaps >= 5 then round(100 * greatest(0, o.room_occ), 0) end,
         case when o.nights >= 5 then round(100 * o.occ, 0) end,
         o.nights::int
  from prop pr
  left join mix x on x.slug = pr.slug
  left join room rm on rm.slug = pr.slug
  left join occ o on o.slug = pr.slug
$$;

revoke all on function public.booking_slug_facts(text[], integer[]) from public, anon, authenticated;
grant execute on function public.booking_slug_facts(text[], integer[]) to service_role;
