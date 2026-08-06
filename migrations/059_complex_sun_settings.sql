-- Настройки солнечно-теневой модели ЖК: ориентация по сторонам света и
-- высоты застройки. Задаются администратором в /admin/sun/<slug>,
-- читаются публичной страницей комплекса.
--
-- Обмер генплана (шаг секций, глубина корпуса, контур участка, бассейны)
-- в эту таблицу НЕ попадает — он неизменен и лежит в lib/complex-sun.ts.

create table if not exists public.complex_sun_settings (
  complex_slug text primary key,
  row_azimuth  numeric not null default 90,   -- азимут ряда, градусы от севера по часовой
  latitude     double precision,
  longitude    double precision,
  eave_height  numeric not null default 6.8,
  ridge_rise   numeric not null default 2.0,
  yard_wall    numeric not null default 2.4,
  enabled      boolean not null default false, -- показывать ли блок на сайте
  updated_at   timestamptz not null default now()
);

comment on table public.complex_sun_settings is
  'Ориентация и высоты 3D-модели ЖК для просмотра инсоляции. PK — slug из raw_complexes.';

-- Без явных грантов рантайм получает тихий permission denied.
grant select, insert, update, delete on public.complex_sun_settings to service_role;
grant select on public.complex_sun_settings to anon, authenticated;

alter table public.complex_sun_settings enable row level security;

drop policy if exists complex_sun_settings_public_read on public.complex_sun_settings;
create policy complex_sun_settings_public_read
  on public.complex_sun_settings for select
  to anon, authenticated
  using (enabled);

insert into public.complex_sun_settings
  (complex_slug, row_azimuth, latitude, longitude, eave_height, ridge_rise, yard_wall, enabled)
values ('u-villas-i', 90, -8.83884, 115.16959, 6.8, 2.0, 2.4, false)
on conflict (complex_slug) do nothing;
