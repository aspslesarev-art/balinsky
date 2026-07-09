-- Route website leads to the developer's own Telegram chat.
--
-- Stored as a dedicated column (NOT inside the JSONB `data` blob) because the
-- Airtable→Supabase sync replaces `data` wholesale on every upsert — a value
-- kept in `data` would be wiped on the next sync. A real column is untouched
-- by the sync (it only writes `data`, `synced_at`, and known columns), so the
-- chat id set via /admin/data survives.
--
-- Value is a Telegram numeric chat_id (e.g. -1001234567890 for a supergroup)
-- of a chat the site bot is a member of. Empty/null → lead falls back to the
-- admin chat only.

alter table raw_developers
  add column if not exists telegram_chat_id text;

comment on column raw_developers.telegram_chat_id is
  'Telegram chat_id (group where the site bot is a member) to route website leads for this developer. Set via /admin/data; not synced from Airtable.';
