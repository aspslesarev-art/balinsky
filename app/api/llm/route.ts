// LLM text layer — serves any page as clean Markdown or JSON to verified AI
// crawlers. middleware.ts rewrites `<path>.md` / `<path>.json` here.
//
// Flow: gate (verified AI bot or preview token) → rate-limit → fetch the
// page's own HTML → reduce to a text model → render md/json.
import { NextResponse } from 'next/server'
import { gate } from '@/lib/llm/bots'
import { rateLimited, clientIp } from '@/lib/llm/ratelimit'
import { htmlToDoc, docToMarkdown, docToJson, type LlmBlock } from '@/lib/llm/extract'
import { detectLang, switchLangPath } from '@/lib/i18n'
import { loadAiCatalog, factsLine, yieldLine, type AiEntry, type AiKind } from '@/lib/llm/catalog'
import { moneyTone } from '@/lib/listing-verdict'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BAD_PREFIX = /^\/(api|_next|admin|feeds|sitemap|robots|favicon|fonts|.*\.[a-z0-9]+$)/i

function sanitizePath(raw: string | null): string | null {
  if (!raw) return null
  let p = raw.trim()
  if (!p.startsWith('/')) p = '/' + p
  p = p.replace(/\.(md|json)$/i, '')
  // Collapse any traversal / double slashes.
  p = p.replace(/\/{2,}/g, '/')
  if (p.includes('..')) return null
  if (p !== '/' && BAD_PREFIX.test(p)) return null
  return p
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const format = (url.searchParams.get('format') || 'md').toLowerCase() === 'json' ? 'json' : 'md'
  const path = sanitizePath(url.searchParams.get('path'))

  if (!path) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  // Текстовый слой — те же публичные страницы, что открыты в HTML, и стоит
  // он только рендер страницы: ботам OpenAI/Perplexity без обратной DNS
  // достаточно User-Agent (см. lib/llm/bots.ts).
  const g = await gate(req, { allowUaOnly: true })
  if (!g.allowed) {
    return new NextResponse(
      `# Access restricted\n\nThe clean text/JSON view is served to verified AI crawlers only.\n` +
      `View this page in a browser: ${url.origin}${path}\n\nReason: ${g.reason}\n`,
      { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    )
  }

  if (rateLimited(clientIp(req.headers))) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  }

  // Fetch the page's own server-rendered HTML. A distinct UA keeps this
  // internal hop out of analytics and never re-enters the gate (pages aren't
  // gated). Next's fetch cache dedupes and revalidates.
  let html: string
  let finalPath = path
  try {
    const res = await fetch(`${url.origin}${path}`, {
      headers: { 'user-agent': 'BalinskyLLM/1.0 (+internal render)', accept: 'text/html' },
      next: { revalidate: 3600 },
    })
    if (res.status === 404) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (!res.ok) return NextResponse.json({ error: 'upstream error', status: res.status }, { status: 502 })
    html = await res.text()
    // Старый адрес мог уйти редиректом на канонический — объект ищем по нему.
    try { finalPath = new URL(res.url).pathname || path } catch { /* остаётся path */ }
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }

  const lang = detectLang(path)
  const doc = htmlToDoc(html, `${url.origin}${path}`, lang)
  // Карточка объекта: в начало — факты и доходность из базы, теми же
  // числами, что на странице. Каталог не загрузился — отдаём страницу как есть.
  const entry = await findEntry(finalPath).catch(() => null)
  if (entry) doc.blocks.unshift(...entryBlocks(entry, lang))

  const cache = 'public, s-maxage=3600, stale-while-revalidate=86400'
  if (format === 'json') {
    const json = docToJson(doc)
    if (entry) json.balinsky = entryJson(entry)
    return NextResponse.json(json, {
      headers: { 'cache-control': cache, 'x-robots-tag': 'noindex', 'x-llm-bot': g.bot ?? '' },
    })
  }
  return new NextResponse(docToMarkdown(doc), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': cache,
      'x-robots-tag': 'noindex',
      'x-llm-bot': g.bot ?? '',
    },
  })
}

// /ru/villy/o/<slug>, /en/villas/o/<slug>, /de/bautraeger/<slug> … → запись каталога.
const RU_DETAIL = /^\/ru\/(villy|apartamenty|zhilye-kompleksy|arenda)\/o\/([^/]+)$|^\/ru\/(zastrojshhiki)\/([^/]+)$/
const SECTION_KIND: Record<string, AiKind> = {
  villy: 'villa', apartamenty: 'apartment', 'zhilye-kompleksy': 'complex', arenda: 'rental', zastrojshhiki: 'developer',
}

async function findEntry(path: string): Promise<AiEntry | null> {
  const m = switchLangPath(path, 'ru').match(RU_DETAIL)
  if (!m) return null
  const kind = SECTION_KIND[m[1] ?? m[3]]
  const slug = decodeURIComponent(m[2] ?? m[4])
  if (!kind || !slug) return null
  const catalog = await loadAiCatalog()
  return catalog.find(e => e.kind === kind && e.slug === slug) ?? null
}

function entryBlocks(e: AiEntry, lang: string): LlmBlock[] {
  const facts = factsLine(e, lang)
  const y = yieldLine(e, lang)
  if (!facts && !y) return []
  const blocks: LlmBlock[] = [{ type: 'heading', level: 2, text: lang === 'ru' ? 'Данные Balinsky' : 'Balinsky data' }]
  if (facts) blocks.push({ type: 'paragraph', text: facts })
  if (y) blocks.push({ type: 'paragraph', text: y })
  return blocks
}

// Те же факты в машинном виде. Доходность — расчёт Balinsky (listing_yields);
// цифра застройщика — отдельным полем и только рядом с нашей.
function entryJson(e: AiEntry): Record<string, unknown> {
  const r1 = (x: number | null) => (x == null ? null : Math.round(x * 1000) / 10)
  const y = e.yield
  return {
    kind: e.kind,
    price_usd: e.priceUsd,
    rent_month_usd: e.rentMonthUsd,
    area_sqm: e.areaSqm,
    land_sqm: e.landSqm,
    bedrooms: e.bedrooms,
    leasehold_years: e.leaseYears,
    status: e.status,
    completion_year: e.year,
    district: e.district,
    developer: e.kind === 'developer' ? null : e.developer,
    balinsky_yield: y ? {
      before_tax_pct: r1(y.capBefore),
      resident_pct: r1(y.capResident),
      non_resident_pct: r1(y.capNonres),
      rental_mode: y.mode,
      occupancy_pct: y.occupancy != null ? Math.round(y.occupancy * 100) : null,
      occupancy_source: y.occSource,
      income_verdict: ({ plus: 'strong', warn: 'average', minus: 'weak' } as const)[moneyTone(y.capBefore)],
    } : null,
    developer_claimed_yield_pct: y && e.claimedYield != null && e.claimedYield > 0 && e.claimedYield < 1 ? r1(e.claimedYield) : null,
  }
}
