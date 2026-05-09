-- Saved-search alerts. Visitor on the catalog clicks "🔔 Уведомлять
-- в Telegram", site creates a draft row with a short pending_token,
-- gives the user a `t.me/<bot>?start=sub_<token>` deep-link. When they
-- open the bot, /start handler claims the draft (sets chat_id, clears
-- pending_token) and the daily-digest cron starts notifying them.
--
-- Why one table for drafts + active subscriptions:
--   - Telegram start-payload is 64 chars max [A-Za-z0-9_-] only, can't
--     fit a JSON filter. Need a server-side intermediate.
--   - Drafts auto-expire (cleanup query in the cron) so abandoned
--     button clicks don't pile up.
--
-- Design choices:
--   - filter is jsonb so we can serialise the full SearchArgs shape
--     (kind, district, bedrooms_min/max, price_min/max, str_only,
--     max_distance_to_beach, etc.) without a column per field.
--   - seen_object_ids is text[] of airtable_ids already pushed to the
--     visitor. Cap is enforced in code (last 500) so the array
--     doesn't grow unbounded.
--   - frequency is just 'daily' for now; 'instant' is a placeholder
--     for the exceptional-match push tier we'll add later.

create table if not exists public.assistant_subscriptions (
  id              bigserial primary key,
  chat_id         bigint,                          -- Telegram chat id (null = pending draft)
  pending_token   text unique,                     -- short random for /start sub_<token>
  filter          jsonb not null,                  -- SearchArgs shape
  name            text,                            -- optional human label ("Чангу 2BR до 300k")
  frequency       text not null default 'daily'
                  check (frequency in ('daily', 'instant')),
  is_active       boolean not null default true,
  last_sent_at    timestamptz,
  seen_object_ids text[] not null default '{}',
  created_at      timestamptz not null default now()
);

-- Lookups: pending_token by /start, chat_id list for /мои command,
-- active subscriptions for the daily cron.
create index if not exists assistant_subs_pending_idx
  on public.assistant_subscriptions (pending_token)
  where pending_token is not null;

create index if not exists assistant_subs_chat_idx
  on public.assistant_subscriptions (chat_id, is_active)
  where chat_id is not null;

create index if not exists assistant_subs_active_idx
  on public.assistant_subscriptions (is_active, frequency, last_sent_at)
  where is_active = true and chat_id is not null;

grant select, insert, update, delete on table public.assistant_subscriptions to service_role;
grant usage, select on sequence public.assistant_subscriptions_id_seq to service_role;
