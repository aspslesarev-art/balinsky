-- Слежение за календарями Airbnb (track.mjs на сервере, с 19.10). Сами календари — в SQLite на сервере.
-- airbnb_occ_listing: последний снимок по объекту (свободно из N ночей на 14 и 90 дней, новые брони за день).
-- Бронь = ночь была свободна и закрылась; 21+ ночь подряд, закрытая за один день, = блок хозяина.
create table if not exists public.airbnb_occ_listing (
  id bigint primary key references public.airbnb_listings(id) on delete cascade,
  run_date date not null,
  open14 int, nights14 int,
  open90 int, nights90 int,
  booked_today int, blocked_today int
);
create table if not exists public.airbnb_occ_runs (
  run_date date primary key,
  listings int, ok int, errors int, minutes int,
  booked_nights int, blocked_nights int,
  finished_at timestamptz
);
alter table public.airbnb_occ_listing enable row level security;
alter table public.airbnb_occ_runs enable row level security;
grant select, insert, update, delete on public.airbnb_occ_listing, public.airbnb_occ_runs to service_role;

-- 122 (20.10): постоянная выборка. Один домашний IP ≈ 4–5 тыс. запросов/час, весь каталог ежедневно не проверить:
-- ~15 тыс. объектов (район × тип × спальни) каждый день, брони только по ним; остальные — раз в неделю.
alter table public.airbnb_occ_listing add column if not exists in_panel boolean not null default false;
