-- Ручная подгонка посадки модели на снимок.
--
-- Обмер генплана не обязан совпадать с построенным объектом (свесы, пристройки),
-- а привязка подложки снимается по кровле с точностью до метра. Поэтому
-- администратору нужны те же степени свободы, что у макета на столе: повернуть,
-- подвинуть, изменить размер — и то же самое отдельно для самого снимка.
--
-- Снимок Google берётся с запасом по площади, так что сдвиг и масштаб подложки
-- выполняются прямо в сцене, без повторных обращений к API.

alter table public.complex_sun_settings
  add column if not exists offset_x         numeric not null default 0,  -- метры, восток положительный
  add column if not exists offset_z         numeric not null default 0,  -- метры, юг положительный
  add column if not exists model_scale      numeric not null default 1,
  add column if not exists basemap_offset_x numeric not null default 0,
  add column if not exists basemap_offset_z numeric not null default 0,
  add column if not exists basemap_scale    numeric not null default 1;

comment on column public.complex_sun_settings.offset_x is 'Сдвиг модели на восток, метры';
comment on column public.complex_sun_settings.offset_z is 'Сдвиг модели на юг, метры';
comment on column public.complex_sun_settings.model_scale is 'Масштаб модели, 1 = размер по обмеру генплана';
comment on column public.complex_sun_settings.basemap_offset_x is 'Сдвиг подложки на восток, метры';
comment on column public.complex_sun_settings.basemap_offset_z is 'Сдвиг подложки на юг, метры';
comment on column public.complex_sun_settings.basemap_scale is 'Масштаб подложки, 1 = масштаб снимка Google';
