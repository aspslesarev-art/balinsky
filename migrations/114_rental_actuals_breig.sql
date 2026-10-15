-- Реальные брони BREIG: отчёт управляющей «Monthly Report - For Sales»
-- (авг 2025 – июль 2026, по одной вилле на лист, ночи проданные/доступные).
-- Владелец разрешил отмечать по нему «Подтверждённую доходность» 16.10.2026.
-- Garden Villa II не берём: с февраля по июль 100% при цене вдвое ниже —
-- вилла сдана надолго, посуточную загрузку это не показывает.
-- «Red Sunset» в отчёте — одна вилла, это Red Sunset I (в комплексе 1 вилла).
-- Спальни в отчёте указаны не везде — тогда bedrooms пустой.

alter table public.complex_rental_actuals drop constraint if exists complex_rental_actuals_pkey;
alter table public.complex_rental_actuals alter column bedrooms drop not null;
create unique index if not exists complex_rental_actuals_key
  on public.complex_rental_actuals (complex_id, unit_kind, coalesce(bedrooms, -1));

insert into public.complex_rental_actuals
  (complex_id, unit_kind, bedrooms, period_from, period_to, units, nights_booked, nights_total, source) values
  ('recwpOefmFTfzKp64', 'villa', 2,    '2025-08-01', '2026-07-31', 1, 298, 362, 'BREIG: отчёт управляющей, Aquamarine I 2Bd'),
  ('recwpOefmFTfzKp64', 'villa', 3,    '2025-08-01', '2026-07-31', 1, 333, 366, 'BREIG: отчёт управляющей, Aquamarine I 3Bd'),
  ('recwpOefmFTfzKp64', 'villa', 4,    '2025-08-01', '2026-07-31', 1, 304, 363, 'BREIG: отчёт управляющей, Aquamarine I 4Bd'),
  ('recnsqk8gbw4fxZol', 'villa', 3,    '2025-08-01', '2026-07-31', 1, 285, 366, 'BREIG: отчёт управляющей, Aquamarine II 3Bd'),
  ('rec4DMewbvW3XsqCH', 'villa', 4,    '2025-08-01', '2026-07-31', 1, 282, 365, 'BREIG: отчёт управляющей, Baliwood I 4Bd'),
  ('recWmiC2vOh7qvgUh', 'villa', 3,    '2025-08-01', '2026-07-31', 1, 257, 365, 'BREIG: отчёт управляющей, Baliwood II 3Bd'),
  ('recnLNYUomagx9yQM', 'villa', null, '2025-08-01', '2026-07-31', 1, 316, 364, 'BREIG: отчёт управляющей, Oasis I'),
  ('recz5h3Xt9pBYcBYv', 'villa', null, '2025-08-01', '2026-07-31', 1, 312, 364, 'BREIG: отчёт управляющей, Oasis II'),
  ('recEGlcSrWYczKzPH', 'villa', null, '2025-08-01', '2026-07-31', 1, 280, 362, 'BREIG: отчёт управляющей, Red Sunset'),
  ('reckM587ADE8m4Ps1', 'villa', 5,    '2025-08-01', '2026-07-31', 1, 262, 358, 'BREIG: отчёт управляющей, River Villa')
on conflict (complex_id, unit_kind, coalesce(bedrooms, -1)) do update set
  period_from = excluded.period_from, period_to = excluded.period_to, units = excluded.units,
  nights_booked = excluded.nights_booked, nights_total = excluded.nights_total,
  source = excluded.source, updated_at = now();

-- Выручка за период, USD (в отчёте BREIG — уже за вычетом комиссии площадок:
-- строки комиссии в отчёте нет). Цена ночи = выручка / проданные ночи.
alter table public.complex_rental_actuals add column if not exists revenue_usd numeric;
update public.complex_rental_actuals a set revenue_usd = v.rev
from (values
  ('recwpOefmFTfzKp64', 2, 64341), ('recwpOefmFTfzKp64', 3, 95842), ('recwpOefmFTfzKp64', 4, 111022),
  ('recnsqk8gbw4fxZol', 3, 84718), ('rec4DMewbvW3XsqCH', 4, 97007), ('recWmiC2vOh7qvgUh', 3, 84967),
  ('recnLNYUomagx9yQM', -1, 38850), ('recz5h3Xt9pBYcBYv', -1, 50958), ('recEGlcSrWYczKzPH', -1, 84343),
  ('reckM587ADE8m4Ps1', 5, 140410)
) as v(cid, br, rev)
where a.complex_id = v.cid and coalesce(a.bedrooms, -1) = v.br;
