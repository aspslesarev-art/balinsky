-- Track every detail-page view across the site.
--
-- One row per page mount (debounced client-side, see
-- components/PageViewTracker.tsx) so we can answer "how many views
-- did villa X / complex Y / developer Z get today?". Aggregations
-- live on /admin/views.
--
-- Bots are filtered server-side by user-agent in /api/track/view.

create table if not exists public.page_views (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  kind          text not null check (kind in (
    'villa', 'apartment', 'complex', 'developer',
    'event', 'promo', 'news', 'knowledge', 'rental'
  )),
  slug          text not null,
  title         text,
  -- Airtable record id when known — useful for cross-referencing
  -- with raw_villas / raw_apartments / etc.
  airtable_id   text,
  lang          text                         -- ru | en
);

create index if not exists page_views_created_at_idx
  on public.page_views (created_at desc);

create index if not exists page_views_kind_created_at_idx
  on public.page_views (kind, created_at desc);

-- Composite (kind, slug) for the per-listing aggregation path.
create index if not exists page_views_kind_slug_idx
  on public.page_views (kind, slug);

create index if not exists page_views_airtable_idx
  on public.page_views (airtable_id)
  where airtable_id is not null;

grant select, insert on table public.page_views to service_role;
grant usage, select on sequence public.page_views_id_seq to service_role;
