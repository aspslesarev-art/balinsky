-- Owner-managed ad banners — moved out of Airtable + JSON manifest
-- into Postgres so the admin UI can do full CRUD without leaving
-- the site. Stats live next door in ad_banner_stats / ad_banner_daily
-- (migration 005); they're keyed by banner_id text and continue to
-- work unchanged.

create table if not exists public.ad_banners (
  id                text primary key,           -- short slug, e.g. "lb-villas-feb"
  image_url         text not null,
  link_url          text not null,
  alt               text not null default '',
  headline          text not null,
  sponsor           text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  active            boolean not null default true,
  impression_limit  bigint,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists ad_banners_active_idx
  on public.ad_banners (active, sort_order)
  where active = true;

grant select, insert, update, delete on table public.ad_banners to service_role;
-- Public read so the site can render banners without going through
-- the service role on each request — same pattern as the rest of
-- our public-readable content tables.
grant select on table public.ad_banners to anon;
