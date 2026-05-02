-- Storage for /api/telegram bot conversations + admin web inbox.
-- Run once in Supabase SQL Editor.

create table if not exists public.bot_chats (
  chat_id           bigint primary key,
  username          text,
  first_name        text,
  last_name         text,
  language_code     text,
  first_seen_at     timestamptz not null default now(),
  last_message_at   timestamptz not null default now(),
  last_message_text text,
  last_inbound_at   timestamptz,
  unread_count      integer not null default 0
);

create table if not exists public.bot_messages (
  id              bigserial primary key,
  chat_id         bigint not null references public.bot_chats(chat_id) on delete cascade,
  direction       text not null check (direction in ('in', 'out')),
  source          text not null check (source in ('user', 'bot', 'manager')),
  text            text,
  start_payload   text,
  tg_message_id   bigint,
  created_at      timestamptz not null default now()
);

create index if not exists bot_messages_chat_created_idx on public.bot_messages (chat_id, created_at desc);
create index if not exists bot_chats_last_message_idx    on public.bot_chats   (last_message_at desc);

-- The service_role key (used by the webhook + admin routes) already has full
-- access to public schema. RLS stays off — admin routes are gated by the
-- ADMIN_PASSWORD env, the webhook is verified via the X-Telegram secret.
