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

  // Top-level pages
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
  ]

  // Filter-canonical pages — drop combos with < MIN_OBJECTS_PER_FILTER_PAGE
  // matches so Google doesn't see thin/empty filter pages.
  let apartments: MetadataRoute.Sitemap = []
  let complexes: MetadataRoute.Sitemap = []
  let villas: MetadataRoute.Sitemap = []
  try {
    const [aData, cData, vData] = await Promise.all([
      loadAllApartments(), loadAllComplexes(), loadAllVillas(),
    ])
    apartments = filterIndexablePaths(listApartmentPaths(), '/ru/apartamenty', aData.enriched, parseAptPath, apartmentPasses)
      .map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    complexes = filterIndexablePaths(listComplexPaths(), '/ru/zhilye-kompleksy', cData.enriched, parseComplexPath, complexPasses)
      .map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    villas = filterIndexablePaths(listVillaPaths(), '/ru/villy', vData.enriched, parseVillaPath, villaPasses)
      .map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
  } catch {
    // Fall back to the unfiltered list if data load fails — better
    // partial sitemap than empty filter section.
    apartments = listApartmentPaths().map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    complexes = listComplexPaths().map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
    villas = listVillaPaths().map(path => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }))
  }

  // Detail pages: news / promo / events / knowledge / rental
  let news: MetadataRoute.Sitemap = []
  let promo: MetadataRoute.Sitemap = []
  let events: MetadataRoute.Sitemap = []
  let knowledge: MetadataRoute.Sitemap = []
  let rental: MetadataRoute.Sitemap = []
  let developers: MetadataRoute.Sitemap = []
  try {
    const [n, p, e, k, r, devSlugs] = await Promise.all([loadAllNews(), loadAllPromo(), loadAllEvents(), loadAllKnowledge(), loadAllRental(), loadDeveloperSlugs()])
    news = n.map(x => ({
      url: `${SITE_URL}/ru/novosti/${x.slug}`,
      lastModified: x.date ? new Date(x.date) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
    promo = p.map(x => ({
      url: `${SITE_URL}/ru/akcii/${x.slug}`,
      lastModified: x.expiresAt ? new Date(x.expiresAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))
    events = e.map(x => ({
      url: `${SITE_URL}/ru/meropriyatiya/${x.slug}`,
      lastModified: x.startsAt ? new Date(x.startsAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))
    knowledge = k.map(x => ({
      url: `${SITE_URL}/ru/znaniya/${x.slug}`,
      lastModified: x.createdTime ? new Date(x.createdTime) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
    // Every rental we ever published — even old listings keep their detail
    // page alive (loadRentalBySlug is no longer fresh-only) so the URLs
    // stay indexable and inbound links from the comparison block still work.
    rental = r.map(x => ({
      url: `${SITE_URL}/ru/arenda/o/${x.slug}`,
      lastModified: x.updatedAt ? new Date(x.updatedAt) : (x.createdTime ? new Date(x.createdTime) : now),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
    // Each developer landing page — high commercial value
    // ("купить квартиру у [застройщик]"), previously missing from the
    // sitemap entirely.
    developers = devSlugs.map(slug => ({
      url: `${SITE_URL}/ru/zastrojshhiki/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // If manifests are unavailable at build time, ship sitemap without those.
  }

  // Dedupe by URL (top-level pages may also be in section listings)
  const seen = new Set<string>()
  const all = [...top, ...apartments, ...complexes, ...villas, ...developers, ...news, ...promo, ...events, ...knowledge, ...rental]
  return all.filter(entry => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}
