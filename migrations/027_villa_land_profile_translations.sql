-- Translations cache for land-profile fields.
-- The RDTR API returns text in Indonesian (Bahasa). We translate
-- the user-facing strings (zone names, GSB rules, building-height
-- rules, regulation title, district names) into RU + EN via Azure
-- OpenAI during sync_villa_land_profile, store the result here.
-- Single jsonb column keeps the migration tiny.
--
-- Shape:
--   { "ru": { "zona_name": "Туристическая зона", "subzona_name": ...,
--             "kabupaten": "Бадунг", "kecamatan": "Кута Утара",
--             "desa": "Чанггу", "gsb_setback": "...",
--             "building_height": "макс. 15 м",
--             "regulation": "Решение Бупати ..." },
--     "en": { ... } }
--
-- Component falls back to the raw Indonesian field when the
-- translation is missing (mid-backfill, or new row).

ALTER TABLE villa_land_profile
  ADD COLUMN IF NOT EXISTS translations jsonb;
