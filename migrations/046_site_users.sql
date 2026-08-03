-- Site accounts, authenticated through the Telegram bot.
--
-- Flow: visitor opens t.me/BalinskyBot?start=login → the bot mints a one-time
-- token bound to their chat id and replies with https://balinsky.info/auth/<token>
-- → that route consumes the token and sets a signed session cookie.
--
-- Only the analytics blocks (heat map, district stats, investment maths,
-- developer reliability) are gated; everything a search engine indexes stays
-- public, so no page becomes login-only.

create table if not exists public.site_users (
  telegram_id   bigint primary key,
  username      text,
  first_name    text,
  last_name     text,
  -- Agents fill in their real name for PDF presentations; investors never
  -- need to, so this stays false until the user says otherwise.
  is_agent      boolean     not null default false,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- One-time login links. Short-lived and single-use: `used_at` is stamped on
-- redemption so a forwarded link cannot log anyone else in.
create table if not exists public.login_tokens (
  token       text primary key,
  telegram_id bigint      not null references public.site_users(telegram_id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);

create index if not exists login_tokens_expires_idx on public.login_tokens (expires_at);

-- Both tables are reached only through the service key on the server; no
-- anon/authenticated policy is granted, so RLS denies everything else.
alter table public.site_users  enable row level security;
alter table public.login_tokens enable row level security;
