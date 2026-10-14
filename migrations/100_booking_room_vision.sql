-- Разбор фото по каждому типу номера (тот же словарь, что booking_data_vision / scripts/_product-vision.mjs).
-- Делается подпиской Claude в сессии, без платных API.
create table if not exists public.booking_room_vision (
  room_id bigint primary key references public.booking_room_facts(room_id) on delete cascade,
  property_id bigint not null,
  vision jsonb not null,
  rated_at timestamptz not null default now()
);
alter table public.booking_room_vision enable row level security;
grant select, insert, update, delete on public.booking_room_vision to service_role;
