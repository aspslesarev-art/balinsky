-- Agent → Developer subscriptions. An agent (any Telegram user, no whitelist
-- in MVP) opens the bot's menu button → Mini App → ticks the developers they
-- work with. When new content appears for those developers (news / promo /
-- events / villas / apartments / complexes) the sync layer pushes a message
-- via Telegram.
create table if not exists public.agent_developer_subscriptions (
  telegram_user_id bigint not null,
  developer_airtable_id text not null,
  created_at timestamptz not null default now(),
  primary key (telegram_user_id, developer_airtable_id)
);

create index if not exists agent_dev_subs_dev_idx on public.agent_developer_subscriptions (developer_airtable_id);
create index if not exists agent_dev_subs_user_idx on public.agent_developer_subscriptions (telegram_user_id);

grant all privileges on table public.agent_developer_subscriptions to service_role;
grant select on table public.agent_developer_subscriptions to anon, authenticated;

-- Deduplication ledger. Without this every sync run would re-broadcast the
-- entire catalog. We mark (source_table, source_id) as notified once the
-- first push goes out and never touch it again.
create table if not exists public.agent_notification_log (
  source_table text not null,
  source_id text not null,
  notified_at timestamptz not null default now(),
  primary key (source_table, source_id)
);

grant all privileges on table public.agent_notification_log to service_role;
grant select on table public.agent_notification_log to anon, authenticated;
