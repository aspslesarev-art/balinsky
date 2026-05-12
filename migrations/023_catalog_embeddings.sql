-- Semantic search: pgvector embeddings on the catalog.
-- text-embedding-3-large outputs 3072 dimensions. We store the
-- representative text alongside the vector so we can detect when
-- a row's content changed and the embedding is stale.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE raw_villas      ADD COLUMN IF NOT EXISTS embedding vector(3072);
ALTER TABLE raw_villas      ADD COLUMN IF NOT EXISTS embedding_text text;
ALTER TABLE raw_villas      ADD COLUMN IF NOT EXISTS embedded_at  timestamptz;

ALTER TABLE raw_apartments  ADD COLUMN IF NOT EXISTS embedding vector(3072);
ALTER TABLE raw_apartments  ADD COLUMN IF NOT EXISTS embedding_text text;
ALTER TABLE raw_apartments  ADD COLUMN IF NOT EXISTS embedded_at  timestamptz;

ALTER TABLE raw_complexes   ADD COLUMN IF NOT EXISTS embedding vector(3072);
ALTER TABLE raw_complexes   ADD COLUMN IF NOT EXISTS embedding_text text;
ALTER TABLE raw_complexes   ADD COLUMN IF NOT EXISTS embedded_at  timestamptz;

-- HNSW index per table for fast cosine similarity lookups. We use
-- vector_cosine_ops because the same model gives comparable cosine
-- similarities across all texts; HNSW handles 3072-dim vectors and
-- is much faster than IVF for our scale (~1.5k villas + ~5k apts).
CREATE INDEX IF NOT EXISTS raw_villas_embedding_hnsw
  ON raw_villas USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS raw_apartments_embedding_hnsw
  ON raw_apartments USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS raw_complexes_embedding_hnsw
  ON raw_complexes USING hnsw (embedding vector_cosine_ops);

-- Unified semantic-search RPC. Returns (kind, airtable_id, distance)
-- across all three tables, ordered by cosine distance ascending.
-- distance is 1 - cosine_similarity (0 = identical, 2 = opposite).
CREATE OR REPLACE FUNCTION semantic_search_catalog(
  query_embedding vector(3072),
  match_count int DEFAULT 12,
  kinds text[] DEFAULT ARRAY['villa','apartment','complex']
)
RETURNS TABLE(kind text, airtable_id text, distance float) AS $$
BEGIN
  RETURN QUERY
  WITH all_hits AS (
    SELECT 'villa'::text AS kind, v.airtable_id, v.embedding <=> query_embedding AS distance
    FROM raw_villas v
    WHERE v.embedding IS NOT NULL
      AND (v.data->>'Опубликовать')::boolean IS TRUE
      AND 'villa' = ANY(kinds)
    UNION ALL
    SELECT 'apartment'::text, a.airtable_id, a.embedding <=> query_embedding
    FROM raw_apartments a
    WHERE a.embedding IS NOT NULL
      AND (a.data->>'Опубликовать')::boolean IS TRUE
      AND 'apartment' = ANY(kinds)
    UNION ALL
    SELECT 'complex'::text, c.airtable_id, c.embedding <=> query_embedding
    FROM raw_complexes c
    WHERE c.embedding IS NOT NULL
      AND 'complex' = ANY(kinds)
  )
  SELECT all_hits.kind, all_hits.airtable_id, all_hits.distance
  FROM all_hits
  ORDER BY all_hits.distance ASC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;
