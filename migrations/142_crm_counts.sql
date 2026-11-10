-- Отчётность по работе с агентами: только цифры, без текста переписки.
-- Текст сообщений остаётся на Маке Андрея; сюда его счётчики присылает
-- tg-business-observer/crm_sync/sync.py (каждые 15 минут).
-- Применено 2026-11-10. В тот же день из tg_messages удалена вся переписка
-- (локальная копия: tg-business-observer/backup_supabase/).
create table if not exists crm_touch_daily (
  day date not null,                 -- день по Бали (UTC+8)
  chat_id bigint not null,
  out_cnt int not null default 0,    -- сообщений написал Андрей
  in_cnt int not null default 0,     -- сообщений написал собеседник
  label text,                        -- имя собеседника (для тех, у кого нет карточки)
  kind text,                         -- agent | outreach | brokers
  updated_at timestamptz not null default now(),
  primary key (day, chat_id)
);
create table if not exists crm_outreach (
  chat_id bigint primary key,
  label text,
  source text,                       -- channel | brokers
  sent_at timestamptz,
  replied_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists crm_sync_status (
  id int primary key default 1,
  synced_at timestamptz
);
alter table crm_touch_daily enable row level security;
alter table crm_outreach enable row level security;
alter table crm_sync_status enable row level security;
grant select, insert, update, delete on crm_touch_daily, crm_outreach, crm_sync_status to service_role;
