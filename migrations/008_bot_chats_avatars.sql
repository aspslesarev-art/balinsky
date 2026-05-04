-- Stores the cached Telegram profile photo URL per chat. We re-fetch
-- via getUserProfilePhotos at most once per 24h (throttled by
-- avatar_checked_at) so we don't hammer Telegram on every webhook.
alter table public.bot_chats
  add column if not exists avatar_url text,
  add column if not exists avatar_checked_at timestamptz;
