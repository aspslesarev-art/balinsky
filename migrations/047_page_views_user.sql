-- Attribute a page view to a signed-in visitor.
--
-- `page_views` (migration 015) has always been anonymous: one row per detail
-- page mount, aggregated on /admin/views to answer "what is getting
-- attention". Now that visitors sign in through the Telegram bot we can also
-- answer "who is looking at this", which is the question that actually starts
-- a sales conversation — an agent circling back to the same villa three times
-- is a reason to message them in the chat we already share.
--
-- Nullable on purpose: guests keep writing rows exactly as before, so nothing
-- about the existing aggregates changes.

alter table public.page_views add column if not exists telegram_id bigint;

-- Partial index — the per-person history is always filtered to signed-in
-- rows, and skipping the (majority) anonymous ones keeps it small.
create index if not exists page_views_telegram_id_created_at_idx
  on public.page_views (telegram_id, created_at desc)
  where telegram_id is not null;
