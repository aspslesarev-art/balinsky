-- 058 — how good is the approach road to this listing.
--
-- Google publishes nothing about road surface or width, so this is assembled
-- from proxies that are actually measurable:
--
--   sv       Street View metadata (free): how far the nearest panorama is and
--            when it was shot. Google's car only drives roads a car can drive —
--            no panorama within ~150 m usually means a narrow gang.
--   car/bike Same trip in DRIVE and TWO_WHEELER modes. When a motorbike takes
--            a shorter or much faster line, the car is being pushed onto a
--            detour: measured at Bingin, car 18.9 km / 65 min vs bike 20.5 km /
--            57 min.
--   detour   Driving distance ÷ straight-line distance to the same anchor. High
--            values mean a winding approach rather than a direct road.
--
-- None of this says "the asphalt is broken" — that still needs photos and the
-- managers' own knowledge. Filled by scripts/build-listing-routes.mjs --access.

alter table public.listing_geo_facts add column if not exists access jsonb;

comment on column public.listing_geo_facts.access is
  'Approach-road proxies: {"sv":{"date":"2025-06","dist_m":18},"car":{"s":3935,"m":18950},"bike":{"s":3453,"m":20451},"detour":1.9}.';
