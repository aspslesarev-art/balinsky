-- Очередь разбора фото: сначала объекты, которые сдаются целиком (виллы) — для
-- «Что влияет на загрузку» их фото нужнее; vision_night.mjs сортирует по prio, room_id.
create or replace view public.booking_room_vision_queue as
 SELECT f.room_id,
    f.property_id,
    f.name,
    array_remove(ARRAY[f.photos[1], f.photos[GREATEST(1, ceil(cardinality(f.photos)::numeric / 3.0)::integer)], f.photos[GREATEST(1, ceil((2 * cardinality(f.photos))::numeric / 3.0)::integer)], f.photos[cardinality(f.photos)]], NULL::text) AS pick,
    case when p.mode = 'single' then 0 else 1 end as prio
   FROM booking_room_facts f
     LEFT JOIN booking_room_vision v ON v.room_id = f.room_id
     LEFT JOIN booking_occ_properties p ON p.id = f.property_id
  WHERE v.room_id IS NULL AND cardinality(f.photos) > 0;
