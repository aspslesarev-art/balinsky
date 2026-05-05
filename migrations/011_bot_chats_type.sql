-- Distinguish private DMs from group/supergroup/channel chats so the
-- admin inbox can split them into two tabs and the webhook can skip
-- auto-replies in groups.
alter table public.bot_chats
  add column if not exists chat_type text default 'private'
    check (chat_type in ('private','group','supergroup','channel')),
  add column if not exists title text;

-- In groups every inbound message has a different speaker. We persist
-- the speaker's display name + Telegram id so the admin UI can attribute
-- each bubble — private chats leave these null.
alter table public.bot_messages
  add column if not exists sender_name text,
  add column if not exists sender_id   bigint;

create index if not exists bot_chats_type_idx
  on public.bot_chats (chat_type, last_message_at desc);
