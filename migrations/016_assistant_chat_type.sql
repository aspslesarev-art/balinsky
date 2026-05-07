-- Allow Балина (the website's AI broker) conversations to live in the
-- same bot_chats / bot_messages tables Telegram already uses. We
-- distinguish them with chat_type='assistant' and synthesise the
-- chat_id from the visitor's session UUID (see /api/chat).
--
-- Synthetic chat_ids occupy a 56-bit positive range that doesn't
-- collide with Telegram's user / group / supergroup IDs:
--   Telegram bot users:  positive, ~10 digits
--   Telegram supergroups: negative, 13+ digits
--   Assistant sessions:  positive, 17 digits (top 8 hex of UUID)

alter table public.bot_chats
  drop constraint if exists bot_chats_chat_type_check;

alter table public.bot_chats
  add constraint bot_chats_chat_type_check
  check (chat_type in ('private', 'group', 'supergroup', 'channel', 'assistant'));
