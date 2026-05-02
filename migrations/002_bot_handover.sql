-- Adds the bot-handover columns:
--   last_manager_at — when the manager last replied through /admin
--   bot_disabled    — manual hard-pause toggle from /admin
-- The webhook skips its auto-reply when bot_disabled is true OR when
-- last_manager_at is within the last 10 minutes.

alter table public.bot_chats add column if not exists last_manager_at timestamptz;
alter table public.bot_chats add column if not exists bot_disabled boolean not null default false;
