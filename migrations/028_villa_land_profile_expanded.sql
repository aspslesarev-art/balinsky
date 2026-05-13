-- Expanded RDTR fields per the "Земля и зонирование" roadmap:
--   use-case markers (hotel/villa/kos/restaurant)
--   zone homogeneity (uniform/mixed across 5 sample points)
--   raw API response (for future re-derivation without re-fetching)
--   3 documents (Perda / Body / Verification) instead of just one PDF
--   Religious-restriction text (Bhisama Khayangan Pura)
--   Composite trust_score for catalog filtering
--
-- Per-villa idempotent — sync script re-fills these on every run.

ALTER TABLE public.villa_land_profile
  ADD COLUMN IF NOT EXISTS raw_response        jsonb,
  ADD COLUMN IF NOT EXISTS document_perda_url  text,
  ADD COLUMN IF NOT EXISTS document_body_url   text,
  ADD COLUMN IF NOT EXISTS document_verification_url text,
  ADD COLUMN IF NOT EXISTS uses_hotel          text,
  ADD COLUMN IF NOT EXISTS uses_villa          text,
  ADD COLUMN IF NOT EXISTS uses_kos            text,
  ADD COLUMN IF NOT EXISTS uses_restaurant     text,
  ADD COLUMN IF NOT EXISTS religious_restrictions text,
  ADD COLUMN IF NOT EXISTS zone_homogeneity    text,
  ADD COLUMN IF NOT EXISTS mixed_zones         text,
  ADD COLUMN IF NOT EXISTS trust_score         smallint;

-- Catalog filters: "Only buildings on tourism/commercial zones" etc.
-- An index on `zone_homogeneity` + the four use-case markers keeps
-- the catalog list query cheap.
CREATE INDEX IF NOT EXISTS villa_land_profile_uses_hotel_idx
  ON public.villa_land_profile (uses_hotel);
CREATE INDEX IF NOT EXISTS villa_land_profile_uses_villa_idx
  ON public.villa_land_profile (uses_villa);
CREATE INDEX IF NOT EXISTS villa_land_profile_zone_homogeneity_idx
  ON public.villa_land_profile (zone_homogeneity);

GRANT ALL PRIVILEGES ON TABLE public.villa_land_profile TO service_role;
