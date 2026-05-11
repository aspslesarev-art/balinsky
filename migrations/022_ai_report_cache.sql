-- AI verdict cache for /api/reports/<kind>/<slug>.
--
-- Each report = one OpenAI call (~$0.01) + cheap PDF render. The
-- verdict is the only expensive part, and listing data rarely
-- changes meaningfully day-to-day, so cache the verdict by kind+slug
-- for 7 days. Repeat downloads cost ~0 OpenAI tokens.

create table if not exists public.ai_report_verdict_cache (
  kind         text not null,
  slug         text not null,
  verdict      jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (kind, slug)
);

create index if not exists ai_report_cache_age_idx
  on public.ai_report_verdict_cache (generated_at);

grant select, insert, update, delete on table public.ai_report_verdict_cache to service_role;
