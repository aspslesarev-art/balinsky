-- Зона объекта хранится в таблице, чтобы сборщик мог сам сравнивать районы день к дню (автопроверка скачков).
alter table public.booking_occ_properties add column if not exists zone text;
update public.booking_occ_properties set zone = booking_zone(lat, lng) where zone is null and lat is not null;
alter table public.booking_occ_runs add column if not exists hotel_occ_pct numeric, add column if not exists alerts text;
