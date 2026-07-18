// AI-facing semantic search over the whole catalogue.
//
// GET /api/llm/search?q=<query>&kinds=villa,complex&limit=10
// Embeds the query through Azure OpenAI and runs the pgvector kb_search over
// assistant_kb (villas / apartments / complexes / developers / districts /
// market / rental — each embedded on an LLM-written investor summary). Returns
// grounded, structured results with a link to the page AND its clean `.md`
// text view, so an AI agent can find the right listings and cite Balinsky.
//
// Same access model as the LLM text layer: verified AI crawlers or the preview
// token. Advertised in /llms.txt.
import { NextResponse } from 'next/server'
import { gate } from '@/lib/llm/bots'
import { rateLimited, clientIp } from '@/lib/llm/ratelimit'
import { kbSearch } from '@/lib/semantic-search'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// kind → English canonical page path (the `.md` twin is `path + '.md'`).
function pagePath(kind: string, slug: string | null): string | null {
  if (!slug) return null
  switch (kind) {
    case 'villa': return `/en/villas/o/${slug}`
    case 'apartment': return `/en/apartments/o/${slug}`
    case 'complex': return `/en/complexes/o/${slug}`
    case 'developer': return `/en/developers/${slug}`
    case 'rental': return `/en/rental/o/${slug}`
    default: return null // district / market aggregates have no single page
  }
}

const KNOWN_KINDS = new Set(['villa', 'apartment', 'complex', 'developer', 'rental', 'district', 'market'])

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || url.searchParams.get('query') || '').trim()
  if (!q) return NextResponse.json({ error: 'missing ?q= query' }, { status: 400 })

  const g = await gate(req)
  if (!g.allowed) {
    return NextResponse.json(
      { error: 'restricted', detail: 'Semantic search is served to verified AI crawlers. See /llms.txt.', reason: g.reason },
      { status: 403 },
    )
  }
  if (rateLimited(clientIp(req.headers))) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 10, 1), 25)
  const kindsRaw = (url.searchParams.get('kinds') || '').split(',').map(s => s.trim()).filter(Boolean)
  const kinds = kindsRaw.filter(k => KNOWN_KINDS.has(k))

  let hits
  try {
    hits = await kbSearch(q, { limit, kinds: kinds.length ? kinds : undefined })
  } catch (e) {
    return NextResponse.json({ error: 'search failed', detail: String(e) }, { status: 502 })
  }

  const results = hits.map(h => {
    const path = pagePath(h.kind, h.slug)
    return {
      title: h.title,
      kind: h.kind,
      url: path ? `${url.origin}${path}` : null,
      text_url: path ? `${url.origin}${path}.md` : null,
      summary: h.summary,
      facts: h.meta ?? {},
      score: Math.round((1 - h.distance) * 1000) / 1000,
    }
  })

  return NextResponse.json(
    { query: q, kinds: kinds.length ? kinds : 'all', count: results.length, results },
    { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600', 'x-robots-tag': 'noindex', 'x-llm-bot': g.bot ?? '' } },
  )
}
