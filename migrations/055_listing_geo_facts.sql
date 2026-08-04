-- 055 — hard geographic facts per listing: real drive times and altitude.
--
-- Straight-line distance lies on Bali. Canggu to the airport is 19 km and
-- 50 minutes; a "10 minutes from the beach" claim can mean half an hour on a
-- Friday. Routes API (traffic-aware) gives the number a buyer actually cares
-- about, and Elevation separates a cliff-top view from a flood-prone lowland.
--
-- Filled by scripts/build-listing-routes.mjs (Routes + Elevation in one run).

create table if not exists public.listing_geo_facts (
  kind        text not null,
  airtable_id text not null,
  lat         double precision not null,
  lng         double precision not null,
  routes      jsonb,
  elevation_m numeric,
  computed_at timestamptz not null default now(),
  primary key (kind, airtable_id)
);

comment on table public.listing_geo_facts is
  'Drive times to Bali anchors (traffic-aware, measured at computed_at) and altitude. routes = {"airport":{"s":2981,"m":18997}, ...}.';

alter table public.listing_geo_facts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'listing_geo_facts' and policyname = 'listing_geo_facts_read'
  ) then
    create policy listing_geo_facts_read on public.listing_geo_facts for select using (true);
  end if;
end $$;

grant select on public.listing_geo_facts to anon, authenticated;
grant all    on public.listing_geo_facts to service_role;
