-- Track every "add to shortlist" (heart-tap) event for analytics.
-- Removes are not tracked — the question we're answering is "what do
-- users like", and removes are noise in that frame.
--
-- Insert path is /api/track/wishlist, fire-and-forget from the
-- WishlistContext add() call. Aggregations live in /admin/wishlist.

create table if not exists public.wishlist_events (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  kind          text not null check (kind in ('villa', 'apartment', 'complex', 'rental')),
  airtable_id   text,                       -- canonical record id
  slug          text not null,
  title         text,
  district      text,
  bedrooms      integer,
  area          numeric,
  price_usd     numeric,
  lang          text                         -- ru | en — locale at the moment of the heart tap
);

create index if not exists wishlist_events_created_at_idx
  on public.wishlist_events (created_at desc);

create index if not exists wishlist_events_kind_created_at_idx
  on public.wishlist_events (kind, created_at desc);

create index if not exists wishlist_events_airtable_idx
  on public.wishlist_events (airtable_id)
  where airtable_id is not null;

-- A composite (kind, slug) index gives the admin "top likes per kind"
-- query a fast group-by path even without the airtable id.
create index if not exists wishlist_events_kind_slug_idx
  on public.wishlist_events (kind, slug);

grant select, insert on table public.wishlist_events to service_role;
grant usage, select on sequence public.wishlist_events_id_seq to service_role;
