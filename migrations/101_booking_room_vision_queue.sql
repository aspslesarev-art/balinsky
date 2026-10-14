-- Очередь ночного разбора фото: номера без разбора, 4 фото «веером» (обложка + равномерно по галерее).
create or replace view public.booking_room_vision_queue as
select f.room_id, f.property_id, f.name,
  array_remove(array[
    f.photos[1],
    f.photos[greatest(1, ceil(cardinality(f.photos) / 3.0)::int)],
    f.photos[greatest(1, ceil(2 * cardinality(f.photos) / 3.0)::int)],
    f.photos[cardinality(f.photos)]
  ], null) as pick
from public.booking_room_facts f
left join public.booking_room_vision v on v.room_id = f.room_id
where v.room_id is null and cardinality(f.photos) > 0;
grant select on public.booking_room_vision_queue to service_role;
