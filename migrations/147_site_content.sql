-- 147: контент, который раньше жил в коде (lib/*.ts), — в базе.
--
-- Одна таблица на всё: (раздел, элемент) → JSON. Примеры:
--   ('complex-docs', 'maison-boheme')            → документы и «что проверено» ЖК
--   ('3d-plans', 'villa:<slug>' | 'apartment:<slug>') → { "url": "/models/….html" }
--   ('sun-plans', '<slug ЖК>')                   → генплан и тени (SitePlan)
--   ('verified-yield', 'villas:<id>')            → {} (флаг «подтверждённая доходность»)
--   ('knowledge-noindex', '<ru-slug>')           → {}
-- Код читает базу; если по разделу в базе нет ни одной строки или база
-- недоступна — берёт старые значения из кода (lib/site-content.ts).
--
-- Любая правка строки ставит ровно затронутые страницы в очередь перестройки
-- (миграция 146, kind = 'site_content', row_id = '<раздел>|<элемент>').

create table if not exists public.site_content (
  section text not null,
  item text not null,
  data jsonb not null default '{}'::jsonb,
  note text,
  updated_at timestamptz not null default now(),
  primary key (section, item)
);

alter table public.site_content enable row level security;
grant select, insert, update, delete on public.site_content to service_role;

create or replace function public.site_content_touch()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch before update on public.site_content
  for each row execute function public.site_content_touch();

create or replace function public.content_change_enqueue_site_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.content_change_put('site_content', old.section || '|' || old.item, 'DELETE', false);
  elsif tg_op = 'INSERT' or old.data is distinct from new.data then
    perform public.content_change_put('site_content', new.section || '|' || new.item, tg_op, false);
  end if;
  return null;
exception when others then
  raise warning 'content_change_enqueue_site_content: %', sqlerrm;
  return null;
end $$;
revoke all on function public.content_change_enqueue_site_content() from public, anon, authenticated;

drop trigger if exists content_change_site_content on public.site_content;
create trigger content_change_site_content after insert or update or delete on public.site_content
  for each row execute function public.content_change_enqueue_site_content();
