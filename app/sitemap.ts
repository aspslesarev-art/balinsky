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

function filterIndexablePaths<T>(
  paths: string[],
  basePath: string,
  enriched: T[],
  parse: Parse,
  passes: Passes<T>,
): string[] {
  return paths.filter(p => {
    if (p === basePath) return true // section landing always in sitemap
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

// Pull developer slugs straight from Supabase. Lightweight one-shot read at
// build time; we only need the SEO:Slug field, so the full data column isn't
// requested for the listing entries.
async function loadDeveloperSlugs(): Promise<string[]> {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    const { data } = await sb.from('raw_developers').select('data').limit(500)
    const out: string[] = []
    for (const r of (data ?? []) as { data: Record<string, unknown> }[]) {
      const v = r.data?.['SEO:Slug']
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Top-level pages (RU + EN). EN catalog uses flat /en/<section> listings
  // (no dimensional filter URLs like RU has), so only the listing root.
  const top: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/ru`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/ru/apartamenty`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/ru/zhilye-kompleksy`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/ru/villy`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/ru/arenda`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/ru/zastrojshhiki`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/ru/novosti`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/ru/akcii`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/ru/meropriyatiya`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/ru/znaniya`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/en`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/en/apartments`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/en/complexes`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/en/villas`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/en/rental`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/en/developers`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/en/news`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/en/promo`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/en/events`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/en/knowledge`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/en/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/en/how-to-buy`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/en/invest-tour`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    // Pillar pages — commercial hub for «инвестиции» / «bali property investment»
    { url: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/en/bali-property-investment`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    // Relocation hub for the «жизнь на Бали / living in Bali» information cluster
    { url: `${SITE_URL}/ru/zhizn-na-bali`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/en/living-in-bali`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    // Trust pages — small priority, but Google reads them for E-E-A-T signals
    { url: `${SITE_URL}/ru/kontakty`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/en/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/ru/politika-konfidencialnosti`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/en/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/ru/usloviya`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/en/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/ru/cookie`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/en/cookie`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    // Programmatic landing — district investment pages
    ...['canggu','uluwatu','ubud','sanur','pererenan','berawa','nusa-dua','nyanyi','melasti','kerobokan','cemagi','umalas'].flatMap(d => [
      { url: `${SITE_URL}/ru/investicii/${d}`,                    lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
      { url: `${SITE_URL}/en/bali-property-investment/${d}`,      lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
    ]),
    // Programmatic landing — completed/scheduled complexes by year
    ...['2023','2024','2025','2026','2027','2028'].flatMap(y => [
      { url: `${SITE_URL}/ru/sdano/${y}`,        lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
      { url: `${SITE_URL}/en/completed-in/${y}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    ]),
  ]

  // One-shot data load — shared between filter routes, RU/EN detail routes
  // and the developer list. Earlier versions loaded the same manifests twice.
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

  // Filter-canonical pages — drop combos with < MIN_OBJECTS_PER_FILTER_PAGE
  // matches so Google doesn't see thin/empty filter pages.
  let apartments: MetadataRoute.Sitemap = []
  let complexes: MetadataRoute.Sitemap = []
  let villas: MetadataRoute.Sitemap = []
  if (vData && aData && cData) {
    apartments = filterIndexablePaths(listApartmentPaths(), '/ru/apartamenty', aData.enriched, parseAptPath, apartmentPasses)
      .map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    complexes = filterIndexablePaths(listComplexPaths(), '/ru/zhilye-kompleksy', cData.enriched, parseComplexPath, complexPasses)
      .map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    villas = filterIndexablePaths(listVillaPaths(), '/ru/villy', vData.enriched, parseVillaPath, villaPasses)
      .map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
  } else {
    // Fall back to the unfiltered list if data load failed.
    apartments = listApartmentPaths().map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    complexes = listComplexPaths().map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    villas = listVillaPaths().map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
  }

  // Object detail pages /o/<slug>. Previously absent from the sitemap
  // entirely for villas/apartments/complexes — Google had to discover them
  // via internal links from filter routes. Each gets a RU + EN URL.
  // Villa/apartment EnrichedRow carries the Airtable row in `data`; the
  // canonical slug lives under `data['SEO:Slug']`. Complex EnrichedRow
  // hoists `slug` to the top level. Handle both shapes.
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
  const objectDetails: MetadataRoute.Sitemap = []
  const emitObjectPair = (enriched: EnrichedLike[] | undefined, ruSection: string, enSection: string) => {
    const seenSlug = new Set<string>()
    for (const e of enriched ?? []) {
      const s = slugOf(e); if (!s) continue
      if (seenSlug.has(s)) continue
      seenSlug.add(s)
      objectDetails.push({ url: `${SITE_URL}/ru/${ruSection}/o/${s}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 })
      objectDetails.push({ url: `${SITE_URL}/en/${enSection}/o/${s}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 })
    }
  }
  emitObjectPair(vData?.enriched as EnrichedLike[] | undefined, 'villy', 'villas')
  emitObjectPair(aData?.enriched as EnrichedLike[] | undefined, 'apartamenty', 'apartments')
  emitObjectPair(cData?.enriched as EnrichedLike[] | undefined, 'zhilye-kompleksy', 'complexes')

  // News / promo / events / knowledge / rental / developers — RU + EN.
  const news: MetadataRoute.Sitemap = []
  for (const x of newsRows) {
    const lm = x.date ? new Date(x.date) : now
    news.push({ url: `${SITE_URL}/ru/novosti/${x.slug}`, lastModified: lm, changeFrequency: 'monthly', priority: 0.6 })
    news.push({ url: `${SITE_URL}/en/news/${x.slug}`,    lastModified: lm, changeFrequency: 'monthly', priority: 0.6 })
  }
  const promo: MetadataRoute.Sitemap = []
  for (const x of promoRows) {
    const lm = x.expiresAt ? new Date(x.expiresAt) : now
    promo.push({ url: `${SITE_URL}/ru/akcii/${x.slug}`, lastModified: lm, changeFrequency: 'weekly', priority: 0.5 })
    promo.push({ url: `${SITE_URL}/en/promo/${x.slug}`, lastModified: lm, changeFrequency: 'weekly', priority: 0.5 })
  }
  const events: MetadataRoute.Sitemap = []
  for (const x of eventsRows) {
    const lm = x.startsAt ? new Date(x.startsAt) : now
    events.push({ url: `${SITE_URL}/ru/meropriyatiya/${x.slug}`, lastModified: lm, changeFrequency: 'weekly', priority: 0.5 })
    events.push({ url: `${SITE_URL}/en/events/${x.slug}`,         lastModified: lm, changeFrequency: 'weekly', priority: 0.5 })
  }
  const knowledge: MetadataRoute.Sitemap = []
  for (const x of knowledgeRows) {
    const lm = x.createdTime ? new Date(x.createdTime) : now
    knowledge.push({ url: `${SITE_URL}/ru/znaniya/${x.slug}`,  lastModified: lm, changeFrequency: 'monthly', priority: 0.5 })
    knowledge.push({ url: `${SITE_URL}/en/knowledge/${x.slug}`, lastModified: lm, changeFrequency: 'monthly', priority: 0.5 })
  }
  // Every rental we ever published — even old listings keep their detail
  // page alive (loadRentalBySlug is no longer fresh-only) so the URLs
  // stay indexable and inbound links from the comparison block still work.
  const rental: MetadataRoute.Sitemap = []
  for (const x of rentalRows) {
    const lm = x.updatedAt ? new Date(x.updatedAt) : (x.createdTime ? new Date(x.createdTime) : now)
    rental.push({ url: `${SITE_URL}/ru/arenda/o/${x.slug}`, lastModified: lm, changeFrequency: 'monthly', priority: 0.5 })
    rental.push({ url: `${SITE_URL}/en/rental/o/${x.slug}`, lastModified: lm, changeFrequency: 'monthly', priority: 0.5 })
  }
  // Each developer landing page — high commercial value
  // ("купить квартиру у [застройщик]"), previously missing from the
  // sitemap entirely.
  const developers: MetadataRoute.Sitemap = []
  for (const slug of devSlugs) {
    developers.push({ url: `${SITE_URL}/ru/zastrojshhiki/${slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 })
    developers.push({ url: `${SITE_URL}/en/developers/${slug}`,    lastModified: now, changeFrequency: 'weekly', priority: 0.7 })
    // Per-developer reviews landing
    developers.push({ url: `${SITE_URL}/ru/zastrojshhiki/${slug}/otzyvy`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 })
  }

  // Dedupe by URL (top-level pages may also be in section listings)
  const seen = new Set<string>()
  const all = [...top, ...apartments, ...complexes, ...villas, ...objectDetails, ...developers, ...news, ...promo, ...events, ...knowledge, ...rental]
  return all.filter(entry => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}
