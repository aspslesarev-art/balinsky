-- Adds media-attachment columns to bot_messages so voice notes,
-- documents and photos round-trip through the admin chat. Files live
-- in the chat-media Storage bucket; the row carries a public URL.
alter table public.bot_messages
  add column if not exists media_type     text,
  add column if not exists media_url      text,
  add column if not exists media_filename text,
  add column if not exists media_mime     text,
  add column if not exists media_duration int,
  add column if not exists media_size     int;

-- Constraint: known media types only.
alter table public.bot_messages
  drop constraint if exists bot_messages_media_type_check;
alter table public.bot_messages
  add constraint bot_messages_media_type_check
  check (media_type is null or media_type in ('voice','audio','photo','document','video','sticker','video_note'));
