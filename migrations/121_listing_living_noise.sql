-- Шум и вулкан для «Для жизни» (lib/living-geo.ts, scripts/build-listing-living.ts):
-- расстояние до большой дороги и до мечети, самолёты, вулкан — по
-- OpenStreetMap (competitors/_osm_noise.json, scripts/osm-noise.mjs).
alter table public.listing_living
  add column if not exists road_m      int,
  add column if not exists road_class  text,
  add column if not exists mosque_m    int,
  add column if not exists flight      text,
  add column if not exists volcano     text,
  add column if not exists volcano_km  numeric,
  add column if not exists cafes_500m  int,
  add column if not exists noise_tone  text;
