-- Same schema as villa_land_profile (post-028), for the two other
-- listing kinds. Keeping three tables (instead of one with a `kind`
-- column) so RLS / GRANT and the existing villa loader stay simple.

CREATE TABLE IF NOT EXISTS public.apartment_land_profile (
  airtable_id              text PRIMARY KEY,
  lat                      double precision NOT NULL,
  lon                      double precision NOT NULL,
  kabupaten                text,
  kecamatan                text,
  desa                     text,
  zona_name                text,
  zona_code                text,
  subzona_name             text,
  subzona_code             text,
  kdb_percent              numeric,
  klb_ratio                numeric,
  kdh_percent              numeric,
  ktb_percent              numeric,
  gsb_setback              text,
  building_height          text,
  allowed_use_count        integer,
  regulation               text,
  regulation_pdf           text,
  str_likely_allowed       text,
  translations             jsonb,
  error                    text,
  synced_at                timestamptz NOT NULL DEFAULT now(),
  raw_response             jsonb,
  document_perda_url       text,
  document_body_url        text,
  document_verification_url text,
  uses_hotel               text,
  uses_villa               text,
  uses_kos                 text,
  uses_restaurant          text,
  religious_restrictions   text,
  zone_homogeneity         text,
  mixed_zones              text,
  trust_score              smallint
);

CREATE TABLE IF NOT EXISTS public.complex_land_profile (
  airtable_id              text PRIMARY KEY,
  lat                      double precision NOT NULL,
  lon                      double precision NOT NULL,
  kabupaten                text,
  kecamatan                text,
  desa                     text,
  zona_name                text,
  zona_code                text,
  subzona_name             text,
  subzona_code             text,
  kdb_percent              numeric,
  klb_ratio                numeric,
  kdh_percent              numeric,
  ktb_percent              numeric,
  gsb_setback              text,
  building_height          text,
  allowed_use_count        integer,
  regulation               text,
  regulation_pdf           text,
  str_likely_allowed       text,
  translations             jsonb,
  error                    text,
  synced_at                timestamptz NOT NULL DEFAULT now(),
  raw_response             jsonb,
  document_perda_url       text,
  document_body_url        text,
  document_verification_url text,
  uses_hotel               text,
  uses_villa               text,
  uses_kos                 text,
  uses_restaurant          text,
  religious_restrictions   text,
  zone_homogeneity         text,
  mixed_zones              text,
  trust_score              smallint
);

CREATE INDEX IF NOT EXISTS apartment_land_profile_uses_villa_idx
  ON public.apartment_land_profile (uses_villa);
CREATE INDEX IF NOT EXISTS complex_land_profile_uses_villa_idx
  ON public.complex_land_profile (uses_villa);

GRANT ALL PRIVILEGES ON TABLE public.apartment_land_profile TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.complex_land_profile TO service_role;

ALTER TABLE public.apartment_land_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complex_land_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access apartments"
  ON public.apartment_land_profile FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role full access complexes"
  ON public.complex_land_profile FOR ALL TO service_role USING (true) WITH CHECK (true);
