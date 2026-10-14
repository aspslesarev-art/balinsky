-- Характеристики каждого типа номера с Booking (страница объекта без дат, apollo-данные):
-- площадь, спальни, кровати, удобства, фото. Основа для «что влияет на загрузку».
create table if not exists public.booking_room_facts (
  room_id bigint primary key,           -- id типа номера на Booking (= data-room-id, booking_data_rooms.room_id)
  property_id bigint not null,          -- booking_occ_properties.id
  name text,
  description text,
  room_type_id int,                     -- категория Booking (9 = double, …)
  size_m2 numeric,
  bedrooms int,
  bathrooms int,
  max_persons int,
  beds jsonb,
  facilities text[],                    -- слаги удобств: balcony, private_pool, sea_view, kitchen, …
  photos text[],                        -- пути фото max1024x768 на cf.bstatic.com
  has_inventory boolean,
  updated_at timestamptz not null default now()
);
create index if not exists booking_room_facts_property on public.booking_room_facts (property_id);

-- Объект: расстояние до берега и пляжа (OSM), считается скриптом.
alter table public.booking_occ_properties
  add column if not exists coast_m int,
  add column if not exists beach_m int,
  add column if not exists review_score numeric,
  add column if not exists review_count int;

alter table public.booking_room_facts enable row level security;
grant select, insert, update, delete on public.booking_room_facts to service_role;
