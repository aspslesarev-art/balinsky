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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
  const objectDetails: SitemapEntry[] = []
  const emitObjectPair = (enriched: EnrichedLike[] | undefined, ruSection: string, enSection: string) => {
    const seenSlug = new Set<string>()
    for (const e of enriched ?? []) {
      const s = slugOf(e); if (!s) continue
      if (seenSlug.has(s)) continue
      seenSlug.add(s)
      const lm = lastmodOfObject(e.data, now)
      objectDetails.push(...pairEntry({
        ruPath: `/ru/${ruSection}/o/${s}`,
        enPath: `/en/${enSection}/o/${s}`,
        lastModified: lm, changeFrequency: 'weekly', priority: 0.7,
      }))
    }
  }
  emitObjectPair(vData?.enriched as EnrichedLike[] | undefined, 'villy', 'villas')
  emitObjectPair(aData?.enriched as EnrichedLike[] | undefined, 'apartamenty', 'apartments')
  emitObjectPair(cData?.enriched as EnrichedLike[] | undefined, 'zhilye-kompleksy', 'complexes')

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
    ruPath: `/ru/znaniya/${x.slug}`, enPath: `/en/knowledge/${x.slug}`,
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

  // Dedupe by URL.
  const seen = new Set<string>()
  const all = [...top, ...apartments, ...complexes, ...villas, ...objectDetails, ...developers, ...news, ...promo, ...events, ...knowledge, ...rental]
  return all.filter(entry => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}
