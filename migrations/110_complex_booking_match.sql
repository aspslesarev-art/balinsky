-- Какие объявления Booking — это сам комплекс из каталога. Если комплекс
-- сдаётся на Booking, калькулятор берёт его загрузку и цену за ночь оттуда,
-- а не средние 60% (решение владельца 15.10.2026, пример — Maison Boheme:
-- 87–94% на Booking против 60% по умолчанию).
--
-- Совпадения подобраны по названию в радиусе ~400 м и проверены вручную:
-- чужие объявления с похожим именем («Bingin Villas», «Uluwatu Apartments»)
-- и снятые с продажи (загрузка 0–15%) выкинуты.

create table if not exists public.complex_booking_match (
  complex_id  text   not null,
  booking_id  bigint not null,
  note        text,
  created_at  timestamptz not null default now(),
  primary key (complex_id, booking_id)
);

alter table public.complex_booking_match enable row level security;
revoke all on public.complex_booking_match from anon, authenticated;
grant select, insert, update, delete on public.complex_booking_match to service_role;

insert into public.complex_booking_match (complex_id, booking_id) values
  ('reclK4YD9Hqh2BuZ4', 17716),
  ('adm_7a2ab1b6fa', 2400),
  ('reclw0ZPggLFU1Ybw', 36154),
  ('reciDTLT5mqQygrl9', 18081),
  ('adm_32bc04fef9', 19062),
  ('rec3JHHoqYbmfU6eJ', 18300),
  ('recep5iWbOMshBmQq', 8930),
  ('rec8A9IzLGw1SqIOD', 36942),
  ('adm_b3da95186e', 38589), ('adm_b3da95186e', 38597),
  ('recietzmiEXuaO2n4', 20978),
  ('adm_78c17fce69', 10159),
  ('recH4aUDZBJRz9TDG', 18694),
  ('recy93m87hvaZydmu', 21352), ('recy93m87hvaZydmu', 20330),
  ('adm_8c785a22af', 17896),
  ('adm_981a4b6f1c', 21054),
  ('recQ0CqWunw8FMxdx', 41774), ('recQ0CqWunw8FMxdx', 21214),
  ('adm_2c2fccc869', 19566),
  ('recZbQXbQg8yhM0ZE', 36473),
  ('reccMKKco6AmlD1hH', 36943),
  ('adm_e965e11ebd', 21017),
  ('recUiojXhfqLAI3BW', 16715),
  ('adm_9acb76fc7c', 10624),
  ('recz5h3Xt9pBYcBYv', 17911),
  ('recYcPKnjQxoKm5ny', 30972),
  ('recjYoFN8rmfSNtAD', 18565),
  ('adm_68fed21166', 19575), ('adm_68fed21166', 27272),
  ('recq44ZtFkpxQYmyD', 17147),
  ('adm_33bcab3374', 10612),
  ('adm_f3138567b5', 42779), ('adm_f3138567b5', 54784),
  ('adm_4d79358e27', 22097), ('adm_4d79358e27', 41351),
  ('adm_6158e1fc28', 3195),
  ('recgrPrMSyMKbJrUJ', 17677), ('recgrPrMSyMKbJrUJ', 17879),
  ('recr6luGAkn7vBYZZ', 21053),
  ('rec3w0Q7qsDFMb5ti', 2013),
  ('recHyQXqyuqRjJIW0', 2019),
  ('recRmr8GnqjResdq2', 42564), ('recRmr8GnqjResdq2', 42562), ('recRmr8GnqjResdq2', 42559),
  ('recRmr8GnqjResdq2', 42551), ('recRmr8GnqjResdq2', 32883), ('recRmr8GnqjResdq2', 42554),
  ('recRmr8GnqjResdq2', 42552), ('recRmr8GnqjResdq2', 42556),
  ('recdJ2e2LeZxUbL06', 18692), ('recdJ2e2LeZxUbL06', 18964),
  ('adm_38c559d595', 21477),
  ('recKz7wJJNzwaxsjB', 32130),
  ('reclkQj48fBC2qRy6', 11257), ('reclkQj48fBC2qRy6', 3086), ('reclkQj48fBC2qRy6', 2434),
  ('adm_fdfc349663', 27438), ('adm_fdfc349663', 27436), ('adm_fdfc349663', 41865), ('adm_fdfc349663', 41928),
  ('adm_fdfc349663', 34930), ('adm_fdfc349663', 53067), ('adm_fdfc349663', 41933), ('adm_fdfc349663', 41867),
  ('adm_fdfc349663', 32886),
  ('recYtf7iEwUpOB3eZ', 37304)
on conflict do nothing;
