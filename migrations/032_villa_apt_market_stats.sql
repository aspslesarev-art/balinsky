-- Per-villa + per-apartment short-term-rental aggregates from
-- estatemarket.io, mirroring `complex_market_stats` (migration 030).
-- We compute these against each listing's own lat/lon rather than the
-- parent complex's centroid, so units that sit a few hundred metres
-- from the masterplan still pull the right comparables.

CREATE TABLE IF NOT EXISTS public.villa_market_stats (
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

CREATE TABLE IF NOT EXISTS public.apartment_market_stats (
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

CREATE INDEX IF NOT EXISTS villa_market_stats_revpar_idx
  ON public.villa_market_stats (villa_revpar_usd DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS apartment_market_stats_revpar_idx
  ON public.apartment_market_stats (apartment_revpar_usd DESC NULLS LAST);

GRANT ALL PRIVILEGES ON TABLE public.villa_market_stats     TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.apartment_market_stats TO service_role;

ALTER TABLE public.villa_market_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_market_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access villa_market_stats"
  ON public.villa_market_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role full access apartment_market_stats"
  ON public.apartment_market_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon read villa_market_stats"
  ON public.villa_market_stats FOR SELECT TO anon USING (true);
CREATE POLICY "anon read apartment_market_stats"
  ON public.apartment_market_stats FOR SELECT TO anon USING (true);
