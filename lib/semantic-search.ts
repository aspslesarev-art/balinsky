// Query-time helper for catalog semantic search.
// Embeds the user's query through Azure OpenAI then asks Postgres
// (via the `semantic_search_catalog` RPC) for the nearest rows in
// vector space.

import { createClient } from '@supabase/supabase-js'
import { embedText } from './embeddings'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type SemanticHit = {
  kind: 'villa' | 'apartment' | 'complex'
  airtable_id: string
  distance: number
}

export type SemanticOptions = {
  limit?: number
  kinds?: Array<'villa' | 'apartment' | 'complex'>
}

// Unified knowledge-base search over assistant_kb (migration 040): every
// kind — villa/apartment/complex/developer/rental + aggregate district/market
// guides — embedded on an LLM-written investor summary. Supersedes the
// catalog-only `semanticSearch` above for the assistant.
export type KbHit = {
  kind: string
  ref_id: string
  slug: string | null
  title: string | null
  summary: string
  meta: Record<string, unknown>
  distance: number
}

export async function kbSearch(
  query: string,
  opts: { limit?: number; kinds?: string[] } = {},
): Promise<KbHit[]> {
  const vec = await embedText(query)
  if (!vec) return []
  const literal = '[' + vec.join(',') + ']'
  const { data, error } = await sb.rpc('kb_search', {
    query_embedding: literal,
    match_count: opts.limit ?? 10,
    kinds: opts.kinds && opts.kinds.length ? opts.kinds : null,
  })
  if (error) {
    console.error('[kb-search] rpc failed:', error.message)
    return []
  }
  return (data ?? []) as KbHit[]
}

export async function semanticSearch(query: string, opts: SemanticOptions = {}): Promise<SemanticHit[]> {
  const limit = opts.limit ?? 12
  const kinds = opts.kinds ?? ['villa', 'apartment', 'complex']
  const vec = await embedText(query)
  if (!vec) return []
  // pgvector accepts the vector as a stringified `[1,2,3,…]`.
  // Supabase JS will serialise the array → string fine for jsonb,
  // but the RPC param is typed `vector` and PostgREST encodes
  // arrays as Postgres array literals which trip the cast. Build
  // the literal explicitly to be safe.
  const literal = '[' + vec.join(',') + ']'
  const { data, error } = await sb.rpc('semantic_search_catalog', {
    query_embedding: literal,
    match_count: limit,
    kinds,
  })
  if (error) {
    console.error('[semantic-search] rpc failed:', error.message)
    return []
  }
  return (data ?? []) as SemanticHit[]
}
