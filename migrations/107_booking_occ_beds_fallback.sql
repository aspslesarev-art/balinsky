-- /admin/booking: спальни целых вилл без данных (15.10, по правилу Андрея «1 bed = 1 bedroom»).
-- Порядок: спальни Booking → название → описание → адрес страницы →
-- двуспальные кровати (поле beds или «The unit has N beds») → гости / 2.
-- Кровати и гости — только для юнитов с названием виллы/апартаментов/студии
-- и без названий-комнат (Double/King Room), иначе комнаты гестхаусов стали бы «виллами».

create or replace view public.booking_occ_single_segment with (security_invoker = on) as
with f as (
  select p.id, p.unit_kind, p.slug,
    (select max(bedrooms) filter (where bedrooms > 0) from public.booking_room_facts x where x.property_id = p.id) b_facts,
    (select max(public.booking_occ_beds(x.name)) from public.booking_room_facts x where x.property_id = p.id) b_name,
    (select max(public.booking_occ_beds(x.description)) from public.booking_room_facts x where x.property_id = p.id) b_desc,
    public.booking_occ_beds(replace(p.slug, '-', ' ')) b_slug,
    (select max(nullif(greatest(
        (select coalesce(sum((b->>'n')::int), 0) from jsonb_array_elements(case when jsonb_typeof(x.beds -> 0) = 'array' then x.beds -> 0 else '[]' end) b
          where b->>'type' not in ('SINGLE_BED', 'BUNK_BED', 'SOFA_BED', 'FUTON')),
        (select count(*) from jsonb_array_elements(case when jsonb_typeof(x.beds -> 0) = 'array' then x.beds -> 0 else '[]' end) b) > 0)::int, 0))
     from public.booking_room_facts x where x.property_id = p.id) b_bedcount,
    (select max((regexp_match(x.description, '(?i)unit (?:has|offers) (\d+) beds?'))[1]::int) from public.booking_room_facts x where x.property_id = p.id) b_bedtxt,
    (select ceil(max(x.max_persons) / 2.0)::int from public.booking_room_facts x where x.property_id = p.id and x.max_persons > 0) b_guests,
    (select bool_or(x.name ~* 'villa|house|home|bungalow|cottage|chalet|joglo|loft|cabin') from public.booking_room_facts x where x.property_id = p.id) unit_name,
    (select bool_or(x.name ~* 'apartment|studio|flat') from public.booking_room_facts x where x.property_id = p.id) apt_name,
    (select bool_or(x.name ~* 'studio' or x.bedrooms = 0) from public.booking_room_facts x where x.property_id = p.id) studio,
    (select bool_or(x.name ~* '\mroom\M') from public.booking_room_facts x where x.property_id = p.id) room_name
  from public.booking_occ_properties p
  where p.mode = 'single'
), s as (
  select *, coalesce(b_facts, b_name, b_desc, b_slug,
    case when (unit_name or apt_name) and not coalesce(room_name, false) and unit_kind in ('villa', 'house', 'apartment')
      then coalesce(b_bedcount, b_bedtxt, b_guests) end)::int beds
  from f
)
select id, beds,
  case
    when unit_kind = 'apartment' then
      'Апартаменты ' || case when beds is null and studio then 'студия' when beds is null then '(спальни не указаны)' when beds >= 3 then '3+ сп' else beds || ' сп' end
    when unit_kind in ('villa', 'house') and (beds is not null or ((unit_name or apt_name) and not coalesce(room_name, false))) then
      'Вилла ' || case when beds is null then '(спальни не указаны)' when beds >= 4 then '4+ сп' else beds || ' сп' end
    when beds is not null and unit_name then
      'Вилла ' || case when beds >= 4 then '4+ сп' else beds || ' сп' end
    when apt_name and not coalesce(room_name, false) then
      'Апартаменты ' || case when beds is null then '(спальни не указаны)' when beds >= 3 then '3+ сп' else beds || ' сп' end
    else 'Номер / комната (сдаётся отдельно)'
  end as seg
from s;
grant select on public.booking_occ_single_segment to service_role;
