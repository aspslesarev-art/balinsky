-- Tags on bot chats — populated automatically when the user opens the bot
-- via a /start deep-link (event_<slug>, manager_<recId>, rental_<id>, …).
-- Used by /admin/broadcast to send a message to everyone with a given tag.

alter table public.bot_chats
  add column if not exists tags text[] not null default '{}';

create index if not exists bot_chats_tags_idx
  on public.bot_chats using gin (tags);

-- Keep the same gotcha as 003: service_role on user-created columns/indexes.
grant all privileges on table public.bot_chats to service_role;
