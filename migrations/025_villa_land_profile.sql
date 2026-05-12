-- Cached land-profile data per villa.
-- Populated by scripts/sync_villa_land_profile.py — pulls every
-- raw_villas row with Geo / Geo 2 coords, hits the gistaru
-- rdtrinteraktif API, stores the zoning + KDB/KLB/etc.
-- Балина reads from here in her search/listing cards to flag
-- short-term-rental viability up-front.

CREATE TABLE IF NOT EXISTS villa_land_profile (
  airtable_id        text        PRIMARY KEY,
  lat                numeric(10, 6) NOT NULL,
  lon                numeric(10, 6) NOT NULL,
  kabupaten          text,
  kecamatan          text,
  desa               text,
  zona_name          text,
  zona_code          text,
  subzona_name       text,
  subzona_code       text,
  kdb_percent        numeric(6, 2),    -- max building footprint
  klb_ratio          numeric(6, 2),    -- max floor-area ratio
  kdh_percent        numeric(6, 2),    -- min green area
  ktb_percent        numeric(6, 2),
  gsb_setback        text,
  building_height    text,
  allowed_use_count  int,
  regulation         text,
  regulation_pdf     text,
  -- Heuristic: "Likely yes (Tourism)", "Probably no (R-4 residential)",
  -- "No (agricultural)" etc. — computed from sub-zone code.
  str_likely_allowed text,
  error              text,
  synced_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS villa_land_profile_kecamatan_idx ON villa_land_profile (kecamatan);
CREATE INDEX IF NOT EXISTS villa_land_profile_subzona_idx   ON villa_land_profile (subzona_code);
CREATE INDEX IF NOT EXISTS villa_land_profile_str_idx       ON villa_land_profile (str_likely_allowed);
