-- 146: автоматическая точечная перестройка страниц при ЛЮБОЙ правке данных.
--
-- Раньше страница обновлялась только после правки в админке (lib/admin/revalidate.ts)
-- или если скрипт сам дёргал /api/revalidate-content. Скрипты, SQL руками,
-- воркер — почти никогда этого не делали, и правка висела до конца TTL (неделя).
--
-- Теперь:
--   1. Триггеры на raw_villas / raw_apartments / raw_complexes / raw_developers
--      и на storage.objects (манифесты новостей, событий, акций, знаний, аренды,
--      менеджеров, видео и фото-манифесты) складывают «что поменялось» в очередь
--      content_change_queue. Одна строка на (вид, запись) — пачка правок одной
--      записи схлопывается в одну.
--   2. pg_cron раз в 2 минуты зовёт content_change_flush(): когда очередь
--      «успокоилась» (2 мин без новых правок) или копится дольше 15 мин, одна
--      пачка уходит POST'ом в https://balinsky.info/api/revalidate-rows, который
--      перестраивает только затронутые страницы (lib/row-revalidate.ts).
--   3. Ответ проверяется на следующем запуске: 200 — строки удаляются из
--      очереди; иначе возвращаются в очередь, а повтор — не раньше чем через
--      час (404 = код ещё не выложен — тогда через 6 часов). До выкладки
--      очередь просто копится и ничего не стоит.
--
-- Холостые перезаписи (тот же data / тот же eTag файла) в очередь не попадают:
-- синки, которые переписывают строки без изменений, не вызывают перестроек.

-- ---------------------------------------------------------------------------
-- Очередь
create table if not exists public.content_change_queue (
  kind text not null,            -- villas | apartments | complexes | developers | manifest
  row_id text not null,          -- airtable_id строки, для manifest — "<bucket>/<name>"
  op text not null,              -- INSERT | UPDATE | DELETE | MANIFEST
  index_change boolean not null default false, -- поменялся slug / публикация / запись создана или удалена
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  batch_id bigint,
  primary key (kind, row_id)
);
create index if not exists content_change_queue_pending on public.content_change_queue (last_at) where batch_id is null;

create table if not exists public.content_change_batches (
  id bigserial primary key,
  request_id bigint,
  items int not null,
  sent_at timestamptz not null default now(),
  status int,
  done_at timestamptz,
  note text
);

-- Снимок манифестов для поиска изменившихся элементов (пишет /api/revalidate-rows).
create table if not exists public.content_manifest_state (
  manifest text not null,        -- "<bucket>/<name>"
  item_id text not null,
  hash text not null,
  meta jsonb,                    -- slug / developers элемента: нужны, когда элемент удалят
  updated_at timestamptz not null default now(),
  primary key (manifest, item_id)
);

alter table public.content_change_queue enable row level security;
alter table public.content_change_batches enable row level security;
alter table public.content_manifest_state enable row level security;
-- Политик нет: anon/authenticated не видят ничего. Сервер ходит service-ключом.
grant select, insert, update, delete on public.content_change_queue to service_role;
grant select, insert, update, delete on public.content_change_batches to service_role;
grant select, insert, update, delete on public.content_manifest_state to service_role;
grant usage, select on sequence public.content_change_batches_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- Постановка в очередь
create or replace function public.content_change_put(p_kind text, p_row_id text, p_op text, p_index boolean)
returns void language sql security definer set search_path = public as $$
  insert into public.content_change_queue as q (kind, row_id, op, index_change)
  values (p_kind, p_row_id, p_op, p_index)
  on conflict (kind, row_id) do update
    set op = excluded.op,
        index_change = q.index_change or excluded.index_change,
        last_at = now(),
        -- запись снова поменялась, пока прошлая пачка в пути — отправить ещё раз
        batch_id = null;
$$;

create or replace function public.content_change_enqueue_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  k text := tg_argv[0];
  o jsonb;
  n jsonb;
  idx boolean := false;
begin
  if tg_op = 'DELETE' then
    perform public.content_change_put(k, old.airtable_id, 'DELETE', true);
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform public.content_change_put(k, new.airtable_id, 'INSERT', true);
    return null;
  end if;
  o := to_jsonb(old);
  n := to_jsonb(new);
  idx := (o->'data'->'SEO:Slug') is distinct from (n->'data'->'SEO:Slug')
      or (o->'data'->'Опубликовать') is distinct from (n->'data'->'Опубликовать')
      or (o->'data'->'Публикация') is distinct from (n->'data'->'Публикация')
      or (o->'slug') is distinct from (n->'slug');
  perform public.content_change_put(k, new.airtable_id, 'UPDATE', idx);
  return null;
exception when others then
  -- Очередь — вспомогательная: её сбой не должен ронять запись данных.
  raise warning 'content_change_enqueue_row: %', sqlerrm;
  return null;
end $$;

drop trigger if exists content_change_villas on public.raw_villas;
create trigger content_change_villas after insert or delete on public.raw_villas
  for each row execute function public.content_change_enqueue_row('villas');
drop trigger if exists content_change_villas_upd on public.raw_villas;
create trigger content_change_villas_upd after update on public.raw_villas
  for each row when (old.data is distinct from new.data)
  execute function public.content_change_enqueue_row('villas');

drop trigger if exists content_change_apartments on public.raw_apartments;
create trigger content_change_apartments after insert or delete on public.raw_apartments
  for each row execute function public.content_change_enqueue_row('apartments');
drop trigger if exists content_change_apartments_upd on public.raw_apartments;
create trigger content_change_apartments_upd after update on public.raw_apartments
  for each row when (old.data is distinct from new.data)
  execute function public.content_change_enqueue_row('apartments');

drop trigger if exists content_change_complexes on public.raw_complexes;
create trigger content_change_complexes after insert or delete on public.raw_complexes
  for each row execute function public.content_change_enqueue_row('complexes');
drop trigger if exists content_change_complexes_upd on public.raw_complexes;
create trigger content_change_complexes_upd after update on public.raw_complexes
  for each row when (old.data is distinct from new.data or old.slug is distinct from new.slug
                     or old.cover_url is distinct from new.cover_url or old.logo_url is distinct from new.logo_url)
  execute function public.content_change_enqueue_row('complexes');

drop trigger if exists content_change_developers on public.raw_developers;
create trigger content_change_developers after insert or delete on public.raw_developers
  for each row execute function public.content_change_enqueue_row('developers');
drop trigger if exists content_change_developers_upd on public.raw_developers;
create trigger content_change_developers_upd after update on public.raw_developers
  for each row when (old.data is distinct from new.data or old.logo_url is distinct from new.logo_url)
  execute function public.content_change_enqueue_row('developers');

-- Манифесты в Storage: только файлы, которые сайт реально рендерит, и только
-- когда содержимое правда поменялось (eTag = md5 файла).
create or replace function public.content_change_manifest_key(p_bucket text, p_name text)
returns boolean language sql immutable as $$
  select (p_bucket, p_name) in (
    ('news', '_news.json'), ('events', '_events.json'), ('promo', '_promo.json'),
    ('knowledge', '_knowledge.json'), ('rental', '_rental.json'),
    ('managers', '_managers.json'), ('feeds', '_videos.json'),
    ('villa-photos', '_manifest.json'), ('apartment-photos', '_manifest.json'),
    ('complex-photos', '_manifest.json')
  );
$$;

create or replace function public.content_change_enqueue_object()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.content_change_manifest_key(new.bucket_id, new.name) then return null; end if;
  if tg_op = 'UPDATE' and (old.metadata->>'eTag') is not distinct from (new.metadata->>'eTag') then
    return null;
  end if;
  perform public.content_change_put('manifest', new.bucket_id || '/' || new.name, 'MANIFEST', false);
  return null;
exception when others then
  -- Сбой очереди не должен ронять загрузку файла в Storage.
  raise warning 'content_change_enqueue_object: %', sqlerrm;
  return null;
end $$;

drop trigger if exists content_change_objects on storage.objects;
create trigger content_change_objects after insert or update on storage.objects
  for each row execute function public.content_change_enqueue_object();

-- ---------------------------------------------------------------------------
-- Токен для /api/revalidate-rows — в Vault, не в коде. Ставится один раз
-- скриптом (scripts/set-revalidate-token.mjs) через RPC под service-ключом.
create or replace function public.content_change_set_token(p_token text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare sid uuid;
begin
  select id into sid from vault.secrets where name = 'balinsky_revalidate_token';
  if sid is null then
    perform vault.create_secret(p_token, 'balinsky_revalidate_token', 'Bearer для balinsky.info/api/revalidate-rows');
  else
    perform vault.update_secret(sid, p_token);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Отправка пачки
create or replace function public.content_change_flush()
returns text language plpgsql security definer set search_path = public, net, vault as $$
declare
  b record;
  r record;
  pending int;
  newest timestamptz;
  oldest timestamptz;
  token text;
  bid bigint;
  rid bigint;
  payload jsonb;
begin
  -- 1. Разобрать ответы на отправленные пачки.
  for b in select * from public.content_change_batches where done_at is null loop
    select status_code into r from net._http_response where id = b.request_id;
    if found then
      update public.content_change_batches set status = r.status_code, done_at = now() where id = b.id;
      if r.status_code = 200 then
        delete from public.content_change_queue where batch_id = b.id;
      else
        update public.content_change_queue set batch_id = null where batch_id = b.id;
      end if;
    elsif b.sent_at < now() - interval '10 minutes' then
      update public.content_change_batches set status = 0, done_at = now(), note = 'no response' where id = b.id;
      update public.content_change_queue set batch_id = null where batch_id = b.id;
    else
      return 'waiting for batch ' || b.id;
    end if;
  end loop;

  -- 2. После ошибки — пауза: 404 (код ещё не выложен) 6 ч, остальное 1 ч.
  select status, done_at into r from public.content_change_batches order by id desc limit 1;
  if found and r.status is distinct from 200 then
    if r.status = 404 and r.done_at > now() - interval '6 hours' then return 'backoff 404'; end if;
    if r.done_at > now() - interval '1 hour' then return 'backoff'; end if;
  end if;

  -- 3. Есть что отправить и очередь успокоилась?
  select count(*), max(last_at), min(first_at) into pending, newest, oldest
    from public.content_change_queue where batch_id is null;
  if pending = 0 then return 'empty'; end if;
  if newest > now() - interval '2 minutes' and oldest > now() - interval '15 minutes' then
    return 'debounce';
  end if;

  select decrypted_secret into token from vault.decrypted_secrets where name = 'balinsky_revalidate_token';
  if token is null then return 'no token'; end if;

  insert into public.content_change_batches (items) values (0) returning id into bid;
  with picked as (
    select kind, row_id from public.content_change_queue
     where batch_id is null order by first_at limit 2000
  )
  update public.content_change_queue q set batch_id = bid
    from picked p where q.kind = p.kind and q.row_id = p.row_id;

  select jsonb_build_object('items', coalesce(jsonb_agg(jsonb_build_object(
           'kind', kind, 'id', row_id, 'op', op, 'index', index_change)), '[]'::jsonb))
    into payload from public.content_change_queue where batch_id = bid;

  rid := net.http_post(
    url := 'https://balinsky.info/api/revalidate-rows',
    body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || token),
    timeout_milliseconds := 60000
  );
  update public.content_change_batches
     set request_id = rid, items = jsonb_array_length(payload->'items') where id = bid;
  return 'sent batch ' || bid;
end $$;

revoke all on function public.content_change_put(text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.content_change_enqueue_row() from public, anon, authenticated;
revoke all on function public.content_change_enqueue_object() from public, anon, authenticated;
revoke all on function public.content_change_set_token(text) from public, anon, authenticated;
revoke all on function public.content_change_flush() from public, anon, authenticated;
grant execute on function public.content_change_set_token(text) to service_role;
grant execute on function public.content_change_flush() to service_role;

-- Раз в 2 минуты; пустая очередь = один быстрый select, без запросов наружу.
select cron.schedule('content-change-flush', '*/2 * * * *', 'select public.content_change_flush()');
