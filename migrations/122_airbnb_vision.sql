-- Разбор фото объявлений Airbnb тем же словарём, что booking_room_vision (vision_rubric.md / _product-vision.mjs).
-- Делает ~/booking-occupancy/api_vision.mjs --airbnb через Message Batches API (промокредиты, 21.10.2026).
create table if not exists public.airbnb_vision (
  id bigint primary key references public.airbnb_listings(id) on delete cascade,
  vision jsonb not null,
  photos text[] not null,              -- какие фото смотрела модель
  model text not null,
  rated_at timestamptz not null default now()
);
alter table public.airbnb_vision enable row level security;
grant select, insert, update, delete on public.airbnb_vision to service_role;

-- Очередь: объявления с фото без разбора. Сначала выборка слежения (panel), потом целые дома.
-- id отдаётся строкой: у новых объявлений он больше 2^53 и в JS округляется.
create or replace view public.airbnb_vision_queue as
select l.id::text as id, l.title, l.room_type, l.property_type, l.bedrooms, l.photos,
  (case when o.in_panel then 0 else 2 end) + (case when l.room_type = 'Entire home/apt' then 0 else 1 end) as prio
from public.airbnb_listings l
left join public.airbnb_vision v on v.id = l.id
left join public.airbnb_occ_listing o on o.id = l.id
where v.id is null and l.photos is not null and jsonb_array_length(l.photos) > 0;
grant select on public.airbnb_vision_queue to service_role;
