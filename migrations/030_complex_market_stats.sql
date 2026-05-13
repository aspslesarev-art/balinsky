-- estatemarket.io aggregated occupancy / ADR / RevPAR per complex,
-- computed from all short-term-rental listings within 500 m of the
-- complex's centroid. Populated by scripts/estatemarket_occupancy.py
-- — rerun monthly via cron.

CREATE TABLE IF NOT EXISTS public.complex_market_stats (
  airtable_id              text PRIMARY KEY,
  lat                      double precision NOT NULL,
  lon                      double precision NOT NULL,
  total_listings_500m      integer NOT NULL DEFAULT 0,
  villa_count              integer NOT NULL DEFAULT 0,
  villa_occupancy_pct      numeric,
  villa_adr_usd            numeric,
  villa_revpar_usd         numeric,
  apartment_count          integer NOT NULL DEFAULT 0,
  apartment_occupancy_pct  numeric,
  apartment_adr_usd        numeric,
  apartment_revpar_usd     numeric,
  synced_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS complex_market_stats_villa_revpar_idx
  ON public.complex_market_stats (villa_revpar_usd DESC NULLS LAST);

GRANT ALL PRIVILEGES ON TABLE public.complex_market_stats TO service_role;

ALTER TABLE public.complex_market_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access market stats"
  ON public.complex_market_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);
