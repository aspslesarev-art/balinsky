-- 149: пробелы админки после отключения Airtable (21.11.2026).
-- Только добавления: новая колонка, функции, триггеры, индексы.
--
-- 1. Архив застройщиков. «Удалить» в /admin/data больше не удаляет строку
--    (на застройщика ссылаются ЖК, виллы, новости — по имени и slug), а
--    ставит archived_at и снимает с публикации. «Восстановить» обнуляет.
--
-- 2. Итоги ЖК по юнитам — то, что раньше считал rollup в Airtable:
--    price_usd  = минимальная цена опубликованных вилл/апартаментов ЖК,
--    «Цена до»  = максимальная,
--    «Юнитов в каталоге» = сколько опубликованных юнитов ЖК.
--    Пересчитываются триггером при любой правке виллы/апартаментов (цена,
--    публикация, привязка к ЖК) — из админки, бота, скрипта или SQL руками.
--    Если у ЖК нет ни одного опубликованного юнита с ценой, price_usd не
--    трогаем: его вводят вручную. «Всего юнитов» (Total quantity of units) —
--    цифра застройщика, её триггер не трогает.
--    Правка raw_complexes, сделанная триггером, сама попадает в очередь
--    точечной перестройки страниц (миграция 146).
--
-- 3. Вид контента 'competitors' для content_version (правка соседей в админке
--    сбрасывает память инстансов, lib/competitors.ts).

-- ---------------------------------------------------------------------------
-- 1. Архив застройщиков
alter table public.raw_developers add column if not exists archived_at timestamptz;
comment on column public.raw_developers.archived_at is
  'Когда застройщик убран в архив из /admin/data. NULL = действующий. Строку не удаляем: на неё ссылаются ЖК/виллы/новости.';

-- ---------------------------------------------------------------------------
-- 2. Итоги ЖК
-- Индексы по ссылке юнита на ЖК: без них пересчёт одного ЖК читал бы все
-- виллы целиком (~60 КБ JSONB на строку).
create index if not exists raw_villas_complex_link_gin on public.raw_villas using gin ((data->'Комплекс'));
create index if not exists raw_apartments_complex_link_gin on public.raw_apartments using gin ((data->'Комплекс'));

-- Цена юнита так же, как её читает сайт (priceOfRow в app/ru/zhilye-kompleksy/_lib.ts):
-- первое положительное из price_usd, price, «Цена».
create or replace function public.positive_number(t text)
returns numeric language sql immutable as $$
  select case when x ~ '^[0-9]+(\.[0-9]+)?$' then nullif(greatest(x::numeric, 0), 0) end
    from (select regexp_replace(coalesce(t, ''), '\s', '', 'g') as x) s
$$;

create or replace function public.unit_price_usd(d jsonb)
returns numeric language sql immutable as $$
  select coalesce(public.positive_number(d->>'price_usd'),
                  public.positive_number(d->>'price'),
                  public.positive_number(d->>'Цена'))
$$;

create or replace function public.complex_totals_refresh(p_complex_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_min numeric;
  v_max numeric;
  v_cnt integer;
  v_old jsonb;
  v_new jsonb;
begin
  if p_complex_id is null or p_complex_id = '' then return; end if;

  select min(p), max(p), count(*)
    into v_min, v_max, v_cnt
    from (
      select public.unit_price_usd(v.data) as p
        from public.raw_villas v
       where v.data->'Комплекс' ? p_complex_id
         and (v.data->>'Опубликовать') = 'true'
      union all
      select public.unit_price_usd(a.data)
        from public.raw_apartments a
       where a.data->'Комплекс' ? p_complex_id
         and (a.data->>'Опубликовать') = 'true'
    ) u;

  select data into v_old from public.raw_complexes where airtable_id = p_complex_id;
  if v_old is null then return; end if;

  v_new := v_old || jsonb_build_object('Юнитов в каталоге', v_cnt);
  if v_min is not null then
    v_new := v_new || jsonb_build_object('price_usd', v_min, 'Цена до', v_max);
  else
    v_new := v_new - 'Цена до';
  end if;

  if v_new is distinct from v_old then
    update public.raw_complexes set data = v_new where airtable_id = p_complex_id;
  end if;
end $$;

revoke all on function public.complex_totals_refresh(text) from public, anon, authenticated;
grant execute on function public.complex_totals_refresh(text) to service_role;

-- id ЖК, на которые ссылается юнит (поле «Комплекс» — массив id, как в Airtable).
create or replace function public.unit_complex_ids(d jsonb)
returns setof text language sql immutable as $$
  select jsonb_array_elements_text(case when jsonb_typeof(d->'Комплекс') = 'array' then d->'Комплекс' else '[]'::jsonb end)
$$;

create or replace function public.complex_totals_on_unit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cid text;
begin
  for cid in
    select distinct x from (
      select public.unit_complex_ids(case when tg_op in ('UPDATE', 'DELETE') then old.data end) as x
      union all
      select public.unit_complex_ids(case when tg_op in ('UPDATE', 'INSERT') then new.data end)
    ) s where x is not null
  loop
    perform public.complex_totals_refresh(cid);
  end loop;
  return null;
exception when others then
  -- Итоги — вспомогательные: их сбой не должен ронять запись юнита.
  raise warning 'complex_totals_on_unit: %', sqlerrm;
  return null;
end $$;

revoke all on function public.complex_totals_on_unit() from public, anon, authenticated;

drop trigger if exists complex_totals_villas on public.raw_villas;
create trigger complex_totals_villas after insert or delete on public.raw_villas
  for each row execute function public.complex_totals_on_unit();
drop trigger if exists complex_totals_villas_upd on public.raw_villas;
create trigger complex_totals_villas_upd after update on public.raw_villas
  for each row when (
    (old.data->'Комплекс') is distinct from (new.data->'Комплекс')
    or (old.data->'Опубликовать') is distinct from (new.data->'Опубликовать')
    or (old.data->'price') is distinct from (new.data->'price')
    or (old.data->'price_usd') is distinct from (new.data->'price_usd')
    or (old.data->'Цена') is distinct from (new.data->'Цена'))
  execute function public.complex_totals_on_unit();

drop trigger if exists complex_totals_apartments on public.raw_apartments;
create trigger complex_totals_apartments after insert or delete on public.raw_apartments
  for each row execute function public.complex_totals_on_unit();
drop trigger if exists complex_totals_apartments_upd on public.raw_apartments;
create trigger complex_totals_apartments_upd after update on public.raw_apartments
  for each row when (
    (old.data->'Комплекс') is distinct from (new.data->'Комплекс')
    or (old.data->'Опубликовать') is distinct from (new.data->'Опубликовать')
    or (old.data->'price') is distinct from (new.data->'price')
    or (old.data->'price_usd') is distinct from (new.data->'price_usd')
    or (old.data->'Цена') is distinct from (new.data->'Цена'))
  execute function public.complex_totals_on_unit();

-- ---------------------------------------------------------------------------
-- 3. Вид контента для соседей по аренде
insert into public.content_version (kind) values ('competitors') on conflict (kind) do nothing;

-- Разовый пересчёт всех ЖК — отдельным шагом после бэкапа затронутых строк:
--   select public.complex_totals_refresh(airtable_id) from public.raw_complexes;
