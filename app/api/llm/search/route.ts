// AI-facing semantic search over the whole catalogue.
//
// GET /api/llm/search?q=<query>&kinds=villa,complex&limit=10
// Embeds the query through Azure OpenAI and runs the pgvector kb_search over
// assistant_kb (villas / apartments / complexes / developers / districts /
// market / rental — each embedded on an LLM-written investor summary). Returns
// grounded, structured results with a link to the page AND its clean `.md`
// text view, so an AI agent can find the right listings and cite Balinsky.
//
// Access: reverse-DNS-verified AI crawlers or the preview token. Unlike the
// .md/.json text layer there is no User-Agent-only exception — every query
// costs a paid Azure embedding. Advertised in /llms.txt.
import { NextResponse } from 'next/server'
import { gate } from '@/lib/llm/bots'
import { rateLimited, clientIp } from '@/lib/llm/ratelimit'
import { kbSearch } from '@/lib/semantic-search'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'
import { loadKbSummaryCache } from '@/lib/kb-summary-i18n'
import { switchLangPath, LANGS, type Lang } from '@/lib/i18n'
import { loadAiCatalog, sanitizeAiText, type AiEntry } from '@/lib/llm/catalog'
import { isHiddenDeveloper } from '@/lib/hidden-developers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Объекты со своей страницей ищем в публичном каталоге (lib/llm/catalog.ts):
// assistant_kb хранит и снятые с публикации, и объекты скрытых застройщиков,
// и старые slug ЖК — такие попадания отбрасываем, ссылку строим по живому slug.
const PAGE_KINDS = new Set(['villa', 'apartment', 'complex', 'developer', 'rental'])

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
  const langRaw = (url.searchParams.get('lang') || 'en').toLowerCase()
  const lang: Lang = (LANGS as readonly string[]).includes(langRaw) ? (langRaw as Lang) : 'en'

  let hits
  let catalog: AiEntry[]
  try {
    // С запасом: часть попаданий отсеется как неопубликованная.
    ;[hits, catalog] = await Promise.all([
      kbSearch(q, { limit: Math.min(limit * 2, 50), kinds: kinds.length ? kinds : undefined }),
      loadAiCatalog(),
    ])
  } catch (e) {
    return NextResponse.json({ error: 'search failed', detail: String(e) }, { status: 502 })
  }
  const byId = new Map(catalog.map(e => [`${e.kind}:${e.id}`, e]))

  // Native-language title/summary where translated; else the RU value
  // (de-Cyrillic'd so no Cyrillic leaks into the response).
  const tr = lang === 'ru' ? {} : await loadKbSummaryCache(lang)
  const deCyr = (s: string | null | undefined) => (s && hasCyrillic(s) ? translitPreserveCase(s) : s ?? null)

  const r1 = (x: number | null | undefined) => (x == null ? null : Math.round(x * 1000) / 10)
  const results = hits.flatMap(h => {
    const entry = PAGE_KINDS.has(h.kind) ? byId.get(`${h.kind}:${h.ref_id}`) : null
    if (PAGE_KINDS.has(h.kind) && !entry) return []
    const meta = { ...(h.meta ?? {}) } as Record<string, unknown>
    if (isHiddenDeveloper(typeof meta.developer === 'string' ? meta.developer : null)) return []
    const path = entry ? switchLangPath(entry.ruPath, lang) : null
    const t = tr[h.ref_id]
    const title = t?.title ?? deCyr(h.title)
    const summaryRaw = t?.summary ?? deCyr(h.summary)
    // Доходность в фактах — только расчёт Balinsky; заявление застройщика
    // переименовано и отдаётся лишь рядом с нашей цифрой. Контакты из
    // объявлений аренды не раздаём.
    const claimed = meta.claimed_yield_pct
    delete meta.claimed_yield_pct
    delete meta.telegram
    delete meta.url
    const y = entry?.yield ?? null
    const facts: Record<string, unknown> = { ...meta }
    if (entry && (entry.kind === 'villa' || entry.kind === 'apartment')) {
      facts.balinsky_yield = y ? {
        before_tax_pct: r1(y.capBefore),
        non_resident_pct: r1(y.capNonres),
        rental_mode: y.mode,
        occupancy_pct: y.occupancy != null ? Math.round(y.occupancy * 100) : null,
      } : null
      if (y && typeof claimed === 'number') facts.developer_claimed_yield_pct = claimed
    }
    return [{
      title,
      kind: h.kind,
      url: path ? `${url.origin}${path}` : null,
      text_url: path ? `${url.origin}${path}.md` : null,
      summary: summaryRaw ? sanitizeAiText(summaryRaw) : null,
      facts,
      score: Math.round((1 - h.distance) * 1000) / 1000,
    }]
  }).slice(0, limit)

  return NextResponse.json(
    { query: q, lang, kinds: kinds.length ? kinds : 'all', count: results.length, results },
    { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600', 'x-robots-tag': 'noindex', 'x-llm-bot': g.bot ?? '' } },
  )
}
