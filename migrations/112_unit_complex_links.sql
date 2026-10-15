-- Связь юнитов с комплексами (просьба владельца 15.10.2026: «свяжи все
-- объекты с их комплексами»). У 380 из 516 опубликованных апартаментов
-- «Комплекс 1» был пустым — страница комплекса и доходность по Booking
-- находили их только по заголовку. Заполняем «Комплекс 1» названием
-- комплекса, которое стоит в заголовке объекта целым словом (самое длинное
-- совпадение: «ROYAL OASIS Black Edition», а не «ROYAL OASIS»).
-- Старые значения — в backup_unit_complex_link_20261015. Применено 15.10.2026
-- (369 строк); повторный запуск ничего не меняет.
create table if not exists public.backup_unit_complex_link_20261015 (
  kind text, airtable_id text, old_k1 jsonb, saved_at timestamp
);
revoke all on public.backup_unit_complex_link_20261015 from anon, authenticated;

with cx as (
  select trim(data->>'Project') name, lower(trim(data->>'Project')) n
  from raw_complexes where length(trim(coalesce(data->>'Project', ''))) >= 4
), u as (
  select airtable_id, lower(coalesce(data->>'SEO:Title', '')) t
  from raw_apartments
  where data->>'Опубликовать' = 'true' and coalesce(trim(data->>'Комплекс 1'), '') = ''
), m as (
  select u.airtable_id, c.name,
    row_number() over (partition by u.airtable_id order by length(c.n) desc) rn
  from u join cx c
    on u.t ~ ('(^|[^[:alnum:]])' || regexp_replace(c.n, '([.()+*?\[\]\\|^$])', '\\\1', 'g') || '($|[^[:alnum:]])')
), b as (
  insert into public.backup_unit_complex_link_20261015 (kind, airtable_id, old_k1, saved_at)
  select 'apartment', a.airtable_id, a.data->'Комплекс 1', now() at time zone 'utc'
  from raw_apartments a join m on m.airtable_id = a.airtable_id and m.rn = 1
  returning 1
)
update raw_apartments a set data = jsonb_set(a.data, '{Комплекс 1}', to_jsonb(m.name))
from m where m.airtable_id = a.airtable_id and m.rn = 1;
