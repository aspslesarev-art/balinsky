-- 056 — sun, climate and air per listing.
--
-- Three sources, because no single one answers the buyer's question:
--   * Google Solar API — maxSunshineHoursPerYear for the actual building under
--     the pin (Bali IS covered; imagery from 2025). One very concrete number.
--   * NASA POWER — month-by-month climate (sunshine, rain, temperature) from
--     multi-year daily data. Public domain and free for commercial use, which
--     Open-Meteo's free tier is not.
--   * Google Air Quality — 30 days of hourly history, averaged. Sampled per
--     area rather than per listing: AQI does not change over a kilometre.
--
-- Filled by scripts/build-listing-environment.mjs.

alter table public.listing_geo_facts add column if not exists sunshine_hours_year numeric;
alter table public.listing_geo_facts add column if not exists solar   jsonb;
alter table public.listing_geo_facts add column if not exists climate jsonb;
alter table public.listing_geo_facts add column if not exists air     jsonb;

comment on column public.listing_geo_facts.sunshine_hours_year is
  'Google Solar maxSunshineHoursPerYear for the nearest building. ~1900 h is typical for coastal Bali.';
comment on column public.listing_geo_facts.climate is
  'NASA POWER monthly climate: {"08":{"sun_h":10.7,"dry_pct":50,"t_max":29.9,"rain_mm":0.8}, ...} keyed by month number.';
comment on column public.listing_geo_facts.air is
  'Google Air Quality, 30-day hourly history averaged: {"uaqi_avg":67,"uaqi_max":82,"ispu_avg":39,"dominant":"pm25","hours":720}.';
