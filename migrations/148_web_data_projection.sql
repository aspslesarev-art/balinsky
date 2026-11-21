-- 148: web_data — «data без балласта» для страниц сайта (egress PostgREST).
--
-- Страницы виллы/квартиры/ЖК читают строку целиком (`select=data`), а в data
-- лежат тяжёлые поля, которые сайт не читает нигде: старые вложения Airtable
-- (ссылки на них протухли, фото берутся из манифеста в Storage), строки
-- «с ошибками» для поиска, QR/PDF-коды. У виллы это ~28 КБ из ~35 КБ.
--
-- Computed column PostgREST: `select=airtable_id,data:web_data` отдаёт тот же
-- объект data, только без перечисленных ключей. Всё остальное байт в байт.
--
-- ВАЖНО: ключ сюда добавлять, только если `grep -rF '<ключ>' app lib components`
-- (кроме admin) пуст. Кто пишет data обратно (read-modify-write), обязан
-- читать полную колонку `data`, а не web_data — иначе удалит эти ключи.
-- Аддитивно: таблицы не меняются.

create or replace function public.web_data(r public.raw_villas)
returns jsonb language sql stable set search_path = '' as $$
  select r.data - array[
    'Название застройщика с ошибками', 'Название района с ошибками', 'Название комплекса с ошибками',
    'Opt photos', 'Фотографии', 'Image Opt', 'Attachments',
    'PDF code', 'Presentation link QR', 'Social:Image'
  ]::text[]
$$;

create or replace function public.web_data(r public.raw_apartments)
returns jsonb language sql stable set search_path = '' as $$
  select r.data - array[
    'Фотографии', 'Opt photos', 'Opt images', 'Attachments'
  ]::text[]
$$;

create or replace function public.web_data(r public.raw_complexes)
returns jsonb language sql stable set search_path = '' as $$
  select r.data - array[
    'Фотографии', 'Opt photos', 'Opt image', 'Главное фото', 'Social:image',
    'Саммари презентации', 'Презентация застройщика pdf'
  ]::text[]
$$;

create or replace function public.web_data(r public.raw_developers)
returns jsonb language sql stable set search_path = '' as $$
  select r.data - array[
    'Варианты поиска', 'Social:Image'
  ]::text[]
$$;

revoke all on function public.web_data(public.raw_villas) from public, anon, authenticated;
revoke all on function public.web_data(public.raw_apartments) from public, anon, authenticated;
revoke all on function public.web_data(public.raw_complexes) from public, anon, authenticated;
revoke all on function public.web_data(public.raw_developers) from public, anon, authenticated;
grant execute on function public.web_data(public.raw_villas) to service_role;
grant execute on function public.web_data(public.raw_apartments) to service_role;
grant execute on function public.web_data(public.raw_complexes) to service_role;
grant execute on function public.web_data(public.raw_developers) to service_role;

notify pgrst, 'reload schema';
