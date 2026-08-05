-- 057 — the same drive times, but at rush hour.
--
-- Migration 055 stored one set of durations, measured whenever the script
-- happened to run — which was late at night, so Bingin→airport read 46 minutes
-- while the older complex_access table (measured at 10:50) said 75. Neither is
-- wrong; the road is simply a different road at different hours.
--
-- So store both and label them. `routes` stays the free-flowing measurement,
-- `routes_peak` is Routes API with an explicit future departureTime in Bali
-- business hours, and routes_peak_at records which moment that was.

alter table public.listing_geo_facts add column if not exists routes_peak    jsonb;
alter table public.listing_geo_facts add column if not exists routes_peak_at timestamptz;

comment on column public.listing_geo_facts.routes_peak is
  'Same shape as routes, but computed for the departure time in routes_peak_at (Bali daytime traffic).';
