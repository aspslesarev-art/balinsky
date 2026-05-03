-- Ad-banner tracking: per-banner impression / click counters and a flag
-- the impression endpoint flips when the contracted impression cap is hit.
-- Banner content itself lives in Airtable (image, link, headline, dates,
-- impression limit) and gets synced into Supabase Storage as a JSON
-- manifest. Stats here mirror live counts that the public site updates.

create table if not exists public.ad_banner_stats (
  banner_id text primary key,
  impressions_count bigint not null default 0,
  clicks_count bigint not null default 0,
  last_impression_at timestamptz,
  last_click_at timestamptz,
  auto_disabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Per-day breakdown so the admin sees a chart "100 impressions today,
-- 80 yesterday, …" without having to spin up a separate analytics tool.
create table if not exists public.ad_banner_daily (
  banner_id text not null,
  day date not null,
  impressions_count bigint not null default 0,
  clicks_count bigint not null default 0,
  primary key (banner_id, day)
);

create index if not exists ad_banner_daily_day_idx on public.ad_banner_daily(day);

grant all privileges on table public.ad_banner_stats to service_role;
grant all privileges on table public.ad_banner_daily to service_role;
