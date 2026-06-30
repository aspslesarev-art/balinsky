import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { listAllCanonicalPaths as listApartmentPaths, parseCleanPath as parseAptPath } from '@/lib/seo-routes'
import { listAllCanonicalPaths as listComplexPaths, parseCleanPath as parseComplexPath } from '@/lib/complex-seo-routes'
import { listAllCanonicalPaths as listVillaPaths, parseCleanPath as parseVillaPath } from '@/lib/villa-seo-routes'
import { loadAll as loadAllVillas, passes as villaPasses } from '@/app/ru/villy/_lib'
import { loadAll as loadAllApartments, passes as apartmentPasses } from '@/app/ru/apartamenty/_lib'
import { loadAll as loadAllComplexes, passes as complexPasses } from '@/app/ru/zhilye-kompleksy/_lib'
import { loadAllNews } from '@/lib/news'
import { loadAllPromo } from '@/lib/promo'
import { loadAllEvents } from '@/lib/events'
import { loadAllKnowledge } from '@/lib/knowledge'
import { enKnowledgeSlug } from '@/lib/knowledge-en-slugs'
import { loadAllRental } from '@/lib/rental'
import { normalizeSlug } from '@/lib/slug-normalize'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

// Filter combinations with fewer matches than this don't make it into the
// sitemap. Otherwise Google indexes near-empty filter pages and folds them
// as "soft 404 / thin content" — drags down the rest of the cluster.
const MIN_OBJECTS_PER_FILTER_PAGE = 3

type Passes<T> = (e: T, f: any) => boolean // eslint-disable-line @typescript-eslint/no-explicit-any
type Parse = (segments: string[]) => any | null // eslint-disable-line @typescript-eslint/no-explicit-any

type SitemapEntry = MetadataRoute.Sitemap[number]

// Emit a RU+EN pair as two sitemap entries each carrying xhtml:link
// alternates pointing at the other language + x-default. Without these
// Google sometimes serves the EN URL to RU visitors (or vice versa) on
// the same query, especially on multi-region terms.
function pairEntry(args: {
  ruPath: string
  enPath: string
  lastModified?: Date
  changeFrequency?: SitemapEntry['changeFrequency']
  priority?: number
}): SitemapEntry[] {
  const { ruPath, enPath, lastModified, changeFrequency, priority } = args
  const ruUrl = `${SITE_URL}${ruPath}`
  const enUrl = `${SITE_URL}${enPath}`
  // x-default = RU per our metadata.alternates convention (the site's
  // origin language). Mirrors what generateMetadata() emits per page.
  const alternates = { languages: { ru: ruUrl, en: enUrl, 'x-default': ruUrl } }
  return [
    { url: ruUrl, lastModified, changeFrequency, priority, alternates },
    { url: enUrl, lastModified, changeFrequency, priority, alternates },
  ]
}

// Pull developer slugs straight from Supabase. Lightweight one-shot read at
// build time; we only need the SEO:Slug field, so the full data column isn't
// requested for the listing entries.
async function loadDeveloperSlugs(): Promise<string[]> {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    // Only the SEO:Slug is needed — comment above said as much, but the
    // select was still pulling the whole `data` blob (~2 MB).
    const { data } = await sb.from('raw_developers').select('slug:data->"SEO:Slug"').limit(500)
    const out: string[] = []
    for (const r of (data ?? []) as { slug: unknown }[]) {
      const v = r.slug
      const slug = typeof v === 'string' ? v
        : (v && typeof v === 'object' && 'value' in v && typeof (v as { value: unknown }).value === 'string')
          ? (v as { value: string }).value
          : null
      if (slug && !slug.startsWith('-')) out.push(slug)
    }
    return [...new Set(out)]
  } catch {
    return []
  }
}

function filterIndexablePaths<T>(
  paths: string[],
  basePath: string,
  enriched: T[],
  parse: Parse,
  passes: Passes<T>,
): string[] {
  return paths.filter(p => {
    if (p === basePath) return true
    const segments = p.replace(`${basePath}/`, '').split('/').filter(Boolean)
    const f = parse(segments)
    if (!f) return false
    let hits = 0
    for (const e of enriched) {
      if (passes(e, f)) {
        hits++
        if (hits >= MIN_OBJECTS_PER_FILTER_PAGE) return true
      }
    }
    return false
  })
}

// Per-record lastmod source — apartments / villas / complexes carry
// editor-set price-update timestamps in Airtable that we want Google to
// see as the freshness signal. Falls back to `now` when missing.
function lastmodOfObject(d: Record<string, unknown> | undefined, fallback: Date): Date {
  if (!d) return fallback
  for (const k of ['Обновление цены', 'Last modified', 'Обновлено', 'Updated', 'synced_at']) {
    const v = d[k]
    const raw = typeof v === 'string' ? v
      : (v && typeof v === 'object' && 'value' in v && typeof (v as { value: unknown }).value === 'string')
        ? (v as { value: string }).value
        : null
    if (raw) {
      const t = new Date(raw)
      if (!isNaN(t.getTime())) return t
    }
  }
  return fallback
}

// Sitemap split. A single sitemap.xml grew past the point where Google /
// Yandex re-fetch it comfortably, so we serve a sitemap *index* at
// /sitemap.xml (app/sitemap.xml/route.ts) that points at one child per
// content cluster, each served by app/sitemap/[id]/route.ts:
//   /sitemap/pages.xml, /sitemap/villy.xml, /sitemap/apartamenty.xml,
//   /sitemap/zhilye-kompleksy.xml, /sitemap/arenda.xml,
//   /sitemap/zastrojshhiki.xml, /sitemap/statyi.xml
// We DON'T use Next's metadata `sitemap.ts` + generateSitemaps convention:
// in Next 16 it serves the children at /sitemap/<id>.xml but does NOT emit
// an index at /sitemap.xml (404s), and that single index URL is exactly
// what gets submitted to GSC / Яндекс.Вебмастер. Hence the hand-rolled
// route handlers + serializers below.
//
// A cluster that would exceed MAX_URLS_PER_SITEMAP is sharded into <cat>,
// <cat>-2, <cat>-3 … so every file stays well under the 50k-URL / 50 MB
// protocol cap and the ≤1 MB target.
export const CATEGORY_ORDER = [
  'pages', 'villy', 'apartamenty', 'zhilye-kompleksy', 'arenda', 'zastrojshhiki', 'statyi',
] as const
type Category = typeof CATEGORY_ORDER[number]
type Categorized = Record<Category, SitemapEntry[]>

// Kept low on purpose to hold every file under the ≤1 MB target. The
// fattest cluster is /arenda (rental): long translit slugs make a paired
// entry with 3 xhtml:link alternates ~730 bytes, so 1200 entries ≈ 0.85 MB.
const MAX_URLS_PER_SITEMAP = 1200

// The two route handlers need the full categorised set, and Next calls them
// back-to-back per regeneration (index, then each child). A short
// module-level memo means we build (and hit the underlying egress-cached
// loaders) once per ISR window instead of once per file.
let _memo: { ts: number; data: Categorized } | null = null
const MEMO_TTL_MS = 60_000

function chunkCount(n: number): number {
  return Math.max(1, Math.ceil(n / MAX_URLS_PER_SITEMAP))
}

// Resolve a sitemap id ("villy", "zhilye-kompleksy-2") back to its category
// and 1-based shard. Category names themselves contain hyphens, so match
// against the known list rather than splitting on "-".
function parseSitemapId(id: string): { category: Category; shard: number } | null {
  const category = CATEGORY_ORDER.find(c => id === c || id.startsWith(`${c}-`))
  if (!category) return null
  const shard = id === category ? 1 : Number(id.slice(category.length + 1))
  if (!Number.isInteger(shard) || shard < 1) return null
  return { category, shard }
}

async function buildCategorized(): Promise<Categorized> {
  if (_memo && Date.now() - _memo.ts < MEMO_TTL_MS) return _memo.data
  const data = await buildAll()
  _memo = { ts: Date.now(), data }
  return data
}

// Ordered list of child sitemap ids (with shards), e.g.
// ['pages','villy','villy-2','apartamenty', …]. Drives both the index and
// the [id] route's generateStaticParams.
export async function listSitemapIds(): Promise<string[]> {
  const data = await buildCategorized()
  const ids: string[] = []
  for (const cat of CATEGORY_ORDER) {
    const chunks = chunkCount(data[cat].length)
    for (let i = 0; i < chunks; i++) ids.push(i === 0 ? cat : `${cat}-${i + 1}`)
  }
  return ids
}

// Entries for one child sitemap, or null for an unknown id.
export async function getSitemapEntries(id: string): Promise<SitemapEntry[] | null> {
  const parsed = parseSitemapId(id)
  if (!parsed) return null
  const data = await buildCategorized()
  const entries = data[parsed.category]
  const chunks = chunkCount(entries.length)
  if (parsed.shard > chunks) return null
  const start = (parsed.shard - 1) * MAX_URLS_PER_SITEMAP
  return entries.slice(start, start + MAX_URLS_PER_SITEMAP)
}

// --- XML serialisers -------------------------------------------------------
// Only `&` realistically appears in our values (URLs are clean [a-z0-9-]
// paths + known segments), but escape the XML-significant five for safety.
function xmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, ch =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&apos;')
}

// <urlset> for one child. Mirrors Next's own resolveSitemap() output
// (loc + xhtml:link alternates + lastmod/changefreq/priority).
export function serializeUrlset(entries: SitemapEntry[]): string {
  const hasAlternates = entries.some(e => Object.keys(e.alternates?.languages ?? {}).length > 0)
  let out = '<?xml version="1.0" encoding="UTF-8"?>\n'
  out += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
  out += hasAlternates ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' : '>\n'
  for (const e of entries) {
    out += '<url>\n'
    out += `<loc>${xmlEscape(e.url)}</loc>\n`
    const languages = e.alternates?.languages
    if (languages) {
      for (const lang in languages) {
        const href = languages[lang as keyof typeof languages]
        if (href) out += `<xhtml:link rel="alternate" hreflang="${xmlEscape(lang)}" href="${xmlEscape(String(href))}" />\n`
      }
    }
    if (e.lastModified) {
      const d = e.lastModified instanceof Date ? e.lastModified.toISOString() : e.lastModified
      out += `<lastmod>${d}</lastmod>\n`
    }
    if (e.changeFrequency) out += `<changefreq>${e.changeFrequency}</changefreq>\n`
    if (typeof e.priority === 'number') out += `<priority>${e.priority}</priority>\n`
    out += '</url>\n'
  }
  out += '</urlset>\n'
  return out
}

// <sitemapindex> pointing at every child at /sitemap/<id>.xml.
export function serializeIndex(ids: string[], siteUrl: string): string {
  const items = ids
    .map(id => `  <sitemap><loc>${xmlEscape(`${siteUrl}/sitemap/${id}.xml`)}</loc></sitemap>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`
}

async function buildAll(): Promise<Categorized> {
  const now = new Date()

  // Top-level pages — every one of these has a RU↔EN pair, emit as such.
  const TOP_PAIRS: Array<{ ru: string; en: string; cf?: SitemapEntry['changeFrequency']; p?: number }> = [
    { ru: '/ru',                                       en: '/en',                                   cf: 'daily',   p: 1.0 },
    { ru: '/ru/apartamenty',                           en: '/en/apartments',                        cf: 'daily',   p: 0.9 },
    { ru: '/ru/zhilye-kompleksy',                      en: '/en/complexes',                         cf: 'daily',   p: 0.9 },
    { ru: '/ru/villy',                                 en: '/en/villas',                            cf: 'daily',   p: 0.9 },
    { ru: '/ru/arenda',                                en: '/en/rental',                            cf: 'daily',   p: 0.8 },
    { ru: '/ru/zastrojshhiki',                         en: '/en/developers',                        cf: 'daily',   p: 0.8 },
    { ru: '/ru/novosti',                               en: '/en/news',                              cf: 'daily',   p: 0.7 },
    { ru: '/ru/akcii',                                 en: '/en/promo',                             cf: 'daily',   p: 0.7 },
    { ru: '/ru/meropriyatiya',                         en: '/en/events',                            cf: 'daily',   p: 0.7 },
    { ru: '/ru/znaniya',                               en: '/en/knowledge',                         cf: 'weekly',  p: 0.6 },
    { ru: '/ru/o-balinsky',                            en: '/en/about',                             cf: 'monthly', p: 0.5 },
    { ru: '/ru/kak-kupit',                             en: '/en/how-to-buy',                        cf: 'monthly', p: 0.5 },
    { ru: '/ru/invest-tour',                           en: '/en/invest-tour',                       cf: 'monthly', p: 0.5 },
    { ru: '/ru/investicii-v-nedvizhimost-bali',        en: '/en/bali-property-investment',          cf: 'weekly',  p: 0.9 },
    { ru: '/ru/zhizn-na-bali',                         en: '/en/living-in-bali',                    cf: 'monthly', p: 0.7 },
    { ru: '/ru/kontakty',                              en: '/en/contact',                           cf: 'monthly', p: 0.4 },
    { ru: '/ru/politika-konfidencialnosti',            en: '/en/privacy',                           cf: 'yearly',  p: 0.3 },
    { ru: '/ru/usloviya',                              en: '/en/terms',                             cf: 'yearly',  p: 0.3 },
    { ru: '/ru/cookie',                                en: '/en/cookie',                            cf: 'yearly',  p: 0.3 },
  ]
  const top: SitemapEntry[] = TOP_PAIRS.flatMap(({ ru, en, cf, p }) =>
    pairEntry({ ruPath: ru, enPath: en, lastModified: now, changeFrequency: cf, priority: p }),
  )
  // Programmatic landing — district investment + completed/scheduled years.
  for (const d of ['canggu','uluwatu','ubud','sanur','pererenan','berawa','nusa-dua','nyanyi','melasti','kerobokan','cemagi','umalas']) {
    top.push(...pairEntry({
      ruPath: `/ru/investicii/${d}`,
      enPath: `/en/bali-property-investment/${d}`,
      lastModified: now, changeFrequency: 'weekly', priority: 0.7,
    }))
  }
  for (const y of ['2023','2024','2025','2026','2027','2028']) {
    top.push(...pairEntry({
      ruPath: `/ru/sdano/${y}`,
      enPath: `/en/completed-in/${y}`,
      lastModified: now, changeFrequency: 'monthly', priority: 0.5,
    }))
  }

  // One-shot data load — shared between filter routes, RU/EN detail routes
  // and the developer list.
  let vData: Awaited<ReturnType<typeof loadAllVillas>> | null = null
  let aData: Awaited<ReturnType<typeof loadAllApartments>> | null = null
  let cData: Awaited<ReturnType<typeof loadAllComplexes>> | null = null
  let newsRows: Awaited<ReturnType<typeof loadAllNews>> = []
  let promoRows: Awaited<ReturnType<typeof loadAllPromo>> = []
  let eventsRows: Awaited<ReturnType<typeof loadAllEvents>> = []
  let knowledgeRows: Awaited<ReturnType<typeof loadAllKnowledge>> = []
  let rentalRows: Awaited<ReturnType<typeof loadAllRental>> = []
  let devSlugs: string[] = []
  try {
    ;[vData, aData, cData, newsRows, promoRows, eventsRows, knowledgeRows, rentalRows, devSlugs] = await Promise.all([
      loadAllVillas(), loadAllApartments(), loadAllComplexes(),
      loadAllNews(), loadAllPromo(), loadAllEvents(), loadAllKnowledge(), loadAllRental(),
      loadDeveloperSlugs(),
    ])
  } catch {
    // Best-effort — partial sitemap still ships.
  }

  // Filter-canonical pages — RU-only (no /en mirror for canonical sub-routes).
  // Drop combos with < MIN_OBJECTS_PER_FILTER_PAGE matches.
  let apartments: SitemapEntry[] = []
  let complexes: SitemapEntry[] = []
  let villas: SitemapEntry[] = []
  if (vData && aData && cData) {
    apartments = filterIndexablePaths(listApartmentPaths(), '/ru/apartamenty', aData.enriched, parseAptPath, apartmentPasses)
      .map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    complexes = filterIndexablePaths(listComplexPaths(), '/ru/zhilye-kompleksy', cData.enriched, parseComplexPath, complexPasses)
      .map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    villas = filterIndexablePaths(listVillaPaths(), '/ru/villy', vData.enriched, parseVillaPath, villaPasses)
      .map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
  } else {
    apartments = listApartmentPaths().map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    complexes = listComplexPaths().map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    villas = listVillaPaths().map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
  }

  // Object detail pages /o/<slug>. RU + EN pair each, with per-record
  // lastmod from Airtable's price-update timestamp where available.
  type EnrichedLike = { slug?: unknown; data?: Record<string, unknown> }
  const slugOf = (e: EnrichedLike): string | null => {
    if (typeof e.slug === 'string' && e.slug) {
      const s = normalizeSlug(e.slug)
      return s && !s.startsWith('-') ? s : null
    }
    const raw = e.data?.['SEO:Slug']
    const str = typeof raw === 'string'
      ? raw
      : (raw && typeof raw === 'object' && 'value' in raw && typeof (raw as { value: unknown }).value === 'string')
        ? (raw as { value: string }).value
        : null
    if (!str) return null
    const s = normalizeSlug(str)
    return s && !s.startsWith('-') ? s : null
  }
  const villaObjects: SitemapEntry[] = []
  const apartmentObjects: SitemapEntry[] = []
  const complexObjects: SitemapEntry[] = []
  const emitObjectPair = (target: SitemapEntry[], enriched: EnrichedLike[] | undefined, ruSection: string, enSection: string) => {
    const seenSlug = new Set<string>()
    for (const e of enriched ?? []) {
      const s = slugOf(e); if (!s) continue
      if (seenSlug.has(s)) continue
      seenSlug.add(s)
      const lm = lastmodOfObject(e.data, now)
      target.push(...pairEntry({
        ruPath: `/ru/${ruSection}/o/${s}`,
        enPath: `/en/${enSection}/o/${s}`,
        lastModified: lm, changeFrequency: 'weekly', priority: 0.7,
      }))
    }
  }
  emitObjectPair(villaObjects, vData?.enriched as EnrichedLike[] | undefined, 'villy', 'villas')
  emitObjectPair(apartmentObjects, aData?.enriched as EnrichedLike[] | undefined, 'apartamenty', 'apartments')
  emitObjectPair(complexObjects, cData?.enriched as EnrichedLike[] | undefined, 'zhilye-kompleksy', 'complexes')

  // News / promo / events / knowledge / rental — RU + EN pairs.
  const news: SitemapEntry[] = newsRows.flatMap(x => pairEntry({
    ruPath: `/ru/novosti/${x.slug}`, enPath: `/en/news/${x.slug}`,
    lastModified: x.date ? new Date(x.date) : now,
    changeFrequency: 'monthly', priority: 0.6,
  }))
  const promo: SitemapEntry[] = promoRows.flatMap(x => pairEntry({
    ruPath: `/ru/akcii/${x.slug}`, enPath: `/en/promo/${x.slug}`,
    lastModified: x.expiresAt ? new Date(x.expiresAt) : now,
    changeFrequency: 'weekly', priority: 0.5,
  }))
  const events: SitemapEntry[] = eventsRows.flatMap(x => pairEntry({
    ruPath: `/ru/meropriyatiya/${x.slug}`, enPath: `/en/events/${x.slug}`,
    lastModified: x.startsAt ? new Date(x.startsAt) : now,
    changeFrequency: 'weekly', priority: 0.5,
  }))
  const knowledge: SitemapEntry[] = knowledgeRows.flatMap(x => pairEntry({
    ruPath: `/ru/znaniya/${x.slug}`, enPath: `/en/knowledge/${enKnowledgeSlug(x.slug)}`,
    lastModified: x.createdTime ? new Date(x.createdTime) : now,
    changeFrequency: 'monthly', priority: 0.5,
  }))
  const rental: SitemapEntry[] = rentalRows.flatMap(x => pairEntry({
    ruPath: `/ru/arenda/o/${x.slug}`, enPath: `/en/rental/o/${x.slug}`,
    lastModified: x.updatedAt ? new Date(x.updatedAt) : (x.createdTime ? new Date(x.createdTime) : now),
    changeFrequency: 'monthly', priority: 0.5,
  }))

  // Developer landings — RU + EN pair, plus per-developer reviews (RU-only).
  const developers: SitemapEntry[] = []
  for (const slug of devSlugs) {
    developers.push(...pairEntry({
      ruPath: `/ru/zastrojshhiki/${slug}`,
      enPath: `/en/developers/${slug}`,
      lastModified: now, changeFrequency: 'weekly', priority: 0.7,
    }))
    // Reviews landing — RU-only programmatic page, no EN mirror.
    developers.push({
      url: `${SITE_URL}/ru/zastrojshhiki/${slug}/otzyvy`,
      lastModified: now, changeFrequency: 'monthly', priority: 0.5,
    })
  }

  // Global dedupe by URL, applied in CATEGORY_ORDER so a URL only ever
  // lands in one child sitemap (the first category that claims it).
  const seen = new Set<string>()
  const dedupe = (entries: SitemapEntry[]): SitemapEntry[] =>
    entries.filter(e => (seen.has(e.url) ? false : (seen.add(e.url), true)))

  return {
    pages: dedupe(top),
    villy: dedupe([...villas, ...villaObjects]),
    apartamenty: dedupe([...apartments, ...apartmentObjects]),
    'zhilye-kompleksy': dedupe([...complexes, ...complexObjects]),
    arenda: dedupe(rental),
    zastrojshhiki: dedupe(developers),
    statyi: dedupe([...news, ...promo, ...events, ...knowledge]),
  }
}
