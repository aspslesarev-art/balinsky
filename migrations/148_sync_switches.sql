-- 148: рубильник импорта из Airtable — в базе, а не в env.
--
-- С 21.11.2026 единственный источник правды — Supabase (правки только через
-- /admin/data). Живых путей Airtable → сайт нет (вебхук и sync-trigger удалены
-- 22.07.2026, GitHub-синки удалены). Остались только ручные скрипты в
-- scripts/legacy-airtable/ и старый ~/balinsky-sync/sync.py. Они запускаются,
-- только если ОДНОВРЕМЕННО:
--   1) ALLOW_AIRTABLE_LEGACY=1 в окружении,
--   2) здесь airtable_import.enabled = true.
-- Нет строки, база недоступна или enabled = false — скрипт отказывается.
-- Включить разово (без выкладки):
--   update public.sync_switches set enabled = true where name = 'airtable_import';
-- И сразу вернуть false после прогона.

create table if not exists public.sync_switches (
  name text primary key,
  enabled boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);

alter table public.sync_switches enable row level security;
grant select, insert, update on public.sync_switches to service_role;

insert into public.sync_switches (name, enabled, note)
values ('airtable_import', false,
        'Airtable отключён 21.11.2026 (решение владельца). Источник правды — Supabase, правки через /admin/data.')
on conflict (name) do nothing;
