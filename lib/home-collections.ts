import { unstable_cache } from 'next/cache'
import {
  loadAll as loadVillas,
  buildAllCards as buildVillaCards,
  EMPTY_FILTERS as VILLA_EMPTY,
} from '@/app/ru/villy/_lib'
import {
  loadAll as loadApts,
  buildAllCards as buildAptCards,
  parseQueryFilters as aptParseFilters,
} from '@/app/ru/apartamenty/_lib'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { getDistrictCopy } from '@/lib/districts'
import type { Lang } from '@/lib/i18n'

// Homepage "Подборки": for each budget tier (villas/apartments up to $X), the
// top-10 best listings per district, ranked by the same smart catalog order
// (investment score + views + freshness + 3h rotation). Rendered as an
// interactive chip block on the landing page.

// Ordered by inventory size — chips render in this order.
const DISTRICT_SLUGS = [
  'canggu', 'berawa', 'pererenan', 'umalas', 'kerobokan', 'cemagi', 'nyanyi',
  'sanur', 'uluwatu', 'ubud', 'nusa-dua', 'melasti',
]

const TIERS = [
  { key: 'villa-200', type: 'villa' as const, max: 200_000 },
  { key: 'villa-300', type: 'villa' as const, max: 300_000 },
  { key: 'villa-500', type: 'villa' as const, max: 500_000 },
  { key: 'apt-100', type: 'apartment' as const, max: 100_000 },
  { key: 'apt-200', type: 'apartment' as const, max: 200_000 },
]

const PER_DISTRICT = 10
const MIN_PER_DISTRICT = 3 // hide near-empty district chips

export type CollItem = {
  slug: string
  title: string
  cover: string | null
  priceUsd: number | null
  bedrooms: number | null
  area: number | null
}
export type CollDistrict = { slug: string; name: string; items: CollItem[] }
export type CollTier = { key: string; type: 'villa' | 'apartment'; max: number; districts: CollDistrict[] }

const norm = (s: string) => s.trim().toLowerCase()

async function build(lang: Lang): Promise<CollTier[]> {
  const [villas, scores, apts] = await Promise.all([loadVillas(), loadAllVillaScores(), loadApts()])
  const villaCards = buildVillaCards(villas.enriched, villas.manifest, VILLA_EMPTY, scores, 'investment-desc', undefined, lang)
  const aptCards = buildAptCards(apts.enriched, apts.manifest, aptParseFilters({}), undefined, lang)

  // district display name → slug for the active language
  const nameToSlug = new Map<string, string>()
  const slugToName = new Map<string, string>()
  for (const s of DISTRICT_SLUGS) {
    // Catalog rows store the raw (usually Latin) Airtable location, so match
    // against both languages' names + the slug itself.
    for (const l of ['en', 'ru'] as const) {
      const c = getDistrictCopy(s, l)
      if (c) nameToSlug.set(norm(c.name), s)
    }
    nameToSlug.set(s, s)
    const disp = getDistrictCopy(s, lang)
    if (disp) slugToName.set(s, disp.name)
  }
  const slugOf = (district: string | null | undefined): string | null => {
    if (!district) return null
    const n = norm(district)
    if (nameToSlug.has(n)) return nameToSlug.get(n)!
    // Sub-area fallback: "Canggu - Berawa", "Pererenan Beach" → first known hit.
    for (const [name, slug] of nameToSlug) if (n.includes(name)) return slug
    return null
  }
  const toItem = (c: { slug: string; title: string; photos: string[]; priceUsd: number | null; bedrooms: number | null; area: number | null }): CollItem =>
    ({ slug: c.slug, title: c.title, cover: c.photos[0] ?? null, priceUsd: c.priceUsd, bedrooms: c.bedrooms, area: c.area })

  const out: CollTier[] = []
  for (const tier of TIERS) {
    const cards = tier.type === 'villa' ? villaCards : aptCards
    const byDistrict = new Map<string, CollItem[]>()
    // cards already in smart-rank order → first N per district are the best
    for (const c of cards) {
      if (c.priceUsd == null || c.priceUsd > tier.max) continue
      const s = slugOf((c as { district?: string | null }).district)
      if (!s) continue
      const arr = byDistrict.get(s) ?? []
      if (arr.length >= PER_DISTRICT) continue
      arr.push(toItem(c))
      byDistrict.set(s, arr)
    }
    const districts = DISTRICT_SLUGS
      .filter(s => (byDistrict.get(s)?.length ?? 0) >= MIN_PER_DISTRICT)
      .map(s => ({ slug: s, name: slugToName.get(s) ?? s, items: byDistrict.get(s)! }))
    if (districts.length) out.push({ key: tier.key, type: tier.type, max: tier.max, districts })
  }
  return out
}

export async function loadHomeCollections(lang: Lang): Promise<CollTier[]> {
  return unstable_cache(() => build(lang), ['home-collections-v3', lang], {
    revalidate: 3600,
    tags: ['content:villas', 'content:apartments'],
  })()
}
