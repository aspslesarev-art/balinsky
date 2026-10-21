-- Оценка и отзывы объектов Booking, которых нет в слежении за загрузкой
-- (booking_occ_properties — только до 40 номеров).
--
-- Владелец 21.10.2026: у номера Bali Beach Hotel не было площади, на Booking
-- она есть (37 м²). ~13 тыс. объектов estatemarket без booking_room_facts
-- собраны ~/booking-occupancy/facts.mjs --cards: номера — в booking_room_facts
-- (как у отслеживаемых), оценка — сюда, чтобы не добавлять их в слежение.

create table if not exists public.booking_property_reviews (
  id bigint primary key,              -- booking_data_cards.id
  slug text not null,
  review_score numeric,               -- из 10; 0/null — оценки нет
  review_count int,
  updated_at timestamptz not null default now()
);
create index if not exists booking_property_reviews_slug on public.booking_property_reviews (slug);
alter table public.booking_property_reviews enable row level security;
grant select, insert, update, delete on public.booking_property_reviews to service_role;
