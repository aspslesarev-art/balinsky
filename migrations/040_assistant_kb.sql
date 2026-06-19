-- Unified semantic knowledge base for the Балина AI consultant.
--
-- Migration 023 put embeddings as columns on raw_villas / raw_apartments /
-- raw_complexes and exposed `semantic_search_catalog`. That works for the
-- three SQL-backed catalogs but leaves out:
--   - developers (raw_developers — no embedding columns)
--   - monthly rentals (manifest-backed: rental/_rental.json in Storage, so
--     there is no row to hang a column on)
--   - aggregate knowledge with no source row at all — district guides,
--     developer rankings, price benchmarks.
--
-- This table is ONE place for the whole semantic layer, across every kind,
-- holding an investor-language `summary` (LLM-generated from clean facts)
-- that is BOTH the embedding source and quotable context for the assistant.
--
-- The legacy raw_* embedding columns + semantic_search_catalog stay in place
-- (no regression) but the assistant is switched to kb_search, which supersedes
-- them.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.assistant_kb (
  id          bigserial PRIMARY KEY,
  -- villa | apartment | complex | developer | rental | district | benchmark
  kind        text NOT NULL,
  -- airtable_id for catalog/developers, manifest slug for rentals, a synthetic
  -- key for aggregates (e.g. 'district:canggu', 'benchmark:villa:canggu').
  ref_id      text NOT NULL,
  slug        text,
  title       text,
  -- The investor-facing summary. Embedding source + quotable by the assistant.
  summary     text NOT NULL,
  embedding   vector(1536),
  -- Exact text that was embedded, to detect staleness (mirrors raw_* design).
  embedding_text text,
  -- Card/ranking payload: price_usd, district, bedrooms, area, url, roi, … so
  -- the assistant (and card builder) need not re-fetch the raw row.
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Hash of the clean source facts the summary was generated from. Lets the
  -- summarizer skip rows whose underlying data has not changed.
  source_hash text,
  embedded_at timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, ref_id)
);

CREATE INDEX IF NOT EXISTS assistant_kb_embedding_hnsw
  ON public.assistant_kb USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS assistant_kb_kind_idx
  ON public.assistant_kb (kind);

-- RLS: enabled like every other public table (migration 038). Only the
-- service role touches this table (summarizer scripts + the server-side
-- assistant), so no anon/auth policies — service_role bypasses RLS.
ALTER TABLE public.assistant_kb ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_kb TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.assistant_kb_id_seq TO service_role;

-- Unified nearest-neighbour search across every kind. `kinds = NULL` searches
-- all kinds; pass an array to scope (e.g. ARRAY['villa','apartment']).
-- distance = cosine distance (0 = identical, 2 = opposite).
CREATE OR REPLACE FUNCTION public.kb_search(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  kinds text[] DEFAULT NULL
)
RETURNS TABLE(
  kind text, ref_id text, slug text, title text,
  summary text, meta jsonb, distance float
) AS $$
  SELECT
    k.kind, k.ref_id, k.slug, k.title,
    k.summary, k.meta,
    k.embedding <=> query_embedding AS distance
  FROM public.assistant_kb k
  WHERE k.embedding IS NOT NULL
    AND (kinds IS NULL OR k.kind = ANY(kinds))
  ORDER BY k.embedding <=> query_embedding ASC
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
