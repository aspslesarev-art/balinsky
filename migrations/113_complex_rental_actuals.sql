-- Реальные брони комплекса (выгрузка управляющей, а не витрина Booking).
-- Только у таких комплексов сайт пишет «Подтверждённая доходность»: загрузка
-- витрины Booking (estatemarket) считает закрытый календарь занятым и собрана
-- лишь с 05.08.2026, в высокий сезон (решение владельца 15.10.2026).
--
-- Maison Boheme: календари 22 юнитов в Guesty (Booking Engine API, только
-- чтение). Управляющая ведёт комплекс в Guesty с 12.05.2026 — до этого брони
-- загружены не все (отзывов до мая нет), поэтому период с 15.05.2026.
-- Занято = статус booked с блоком брони; блоки хозяина в знаменателе.

create table if not exists public.complex_rental_actuals (
  complex_id     text    not null,
  unit_kind      text    not null check (unit_kind in ('villa', 'apartment')),
  bedrooms       int     not null,
  period_from    date    not null,
  period_to      date    not null,
  units          int     not null,
  nights_booked  int     not null,
  nights_total   int     not null,
  source         text    not null,
  updated_at     timestamptz not null default now(),
  primary key (complex_id, unit_kind, bedrooms)
);

alter table public.complex_rental_actuals enable row level security;
revoke all on public.complex_rental_actuals from anon, authenticated;
grant select, insert, update, delete on public.complex_rental_actuals to service_role;

insert into public.complex_rental_actuals
  (complex_id, unit_kind, bedrooms, period_from, period_to, units, nights_booked, nights_total, source) values
  ('recQ0CqWunw8FMxdx', 'apartment', 1, '2026-05-15', '2026-10-14', 16, 2307, 2448, 'Guesty: календари юнитов MSN'),
  ('recQ0CqWunw8FMxdx', 'apartment', 2, '2026-05-15', '2026-10-14',  4,  461,  612, 'Guesty: календари юнитов MSN'),
  ('recQ0CqWunw8FMxdx', 'villa',     1, '2026-05-15', '2026-10-14',  1,  138,  153, 'Guesty: календари юнитов MSN'),
  ('recQ0CqWunw8FMxdx', 'villa',     2, '2026-05-15', '2026-10-14',  1,  143,  153, 'Guesty: календари юнитов MSN')
on conflict (complex_id, unit_kind, bedrooms) do update set
  period_from = excluded.period_from, period_to = excluded.period_to, units = excluded.units,
  nights_booked = excluded.nights_booked, nights_total = excluded.nights_total,
  source = excluded.source, updated_at = now();
