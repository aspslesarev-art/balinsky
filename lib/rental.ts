import { applyManifestTranslation, loadTranslations } from '@/lib/en-translations'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import { normalizeSlug } from '@/lib/slug-normalize'
import type { Lang } from '@/lib/i18n'
import { unstable_cache } from 'next/cache'

export type RentalItem = {
  id: string
  slug: string
  title: string
  type: string | null
  bedrooms: number | null
  location: string | null
  priceMonthUsd: number
  priceSegment: string | null
  notes: string | null
  telegram: string | null
  photos: string[]
  createdTime: string | null
  updatedAt: string | null
}
type Manifest = { generatedAt: string; count: number; items: RentalItem[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/rental/_rental.json`

const EN_FIELDS = ['title', 'notes'] as const

// Listings older than the first window drop out of the /arenda catalog so the
// page doesn't fill up with stale offers nobody can rent any more.
// Detail pages (/arenda/o/<slug>) and the villa-page comparison block use
// wider windows so links stay alive and old prices keep doing SEO duty.
//
// It is a ladder, not a single window, because a paused sync must never blank
// the section: on 03.09.2026 the newest listing in the manifest was 51 days
// old, so every /arenda in all ten locales rendered «0 объектов» — and the
// meta title collapsed to «Аренда на Бали: объектов помесячно и посуточно» —
// while 1485 listings sat unused. Widening beats shipping an empty catalog,
// and the ladder collapses back to 30 days on its own once the sync resumes.
const FRESH_WINDOW_LADDER_DAYS = [30, 90, 180] as const
// Comparison block on villa/apartment detail uses anything from the last
// half year — recent enough to be a useful benchmark, not so old the price
// has shifted by 30%+.
export const COMPARE_WINDOW_DAYS = 180

function withinDays(item: RentalItem, days: number, now: number): boolean {
  if (!item.createdTime) return false
  const t = Date.parse(item.createdTime)
  if (!Number.isFinite(t)) return false
  return now - t <= days * 24 * 60 * 60 * 1000
}

async function loadRawRental(): Promise<RentalItem[]> {
  try {
    // Served via CDN edge cache (the 2MB file exceeds Next's fetch-cache
    // limit, so without this every render re-pulls it from Supabase egress).
    const r = await fetch(cdnManifestUrl(MANIFEST_URL, 600), { next: { revalidate: 86400, tags: ['content:rental'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    if (!Array.isArray(j.items)) return []
    // Normalize slugs on the way in: ~93 manifest slugs carry trailing/double
    // dashes from truncated titles (e.g. "…120 m² —" → "…-120-m-"). The detail
    // route resolves the normalized form, so an un-normalized slug in the
    // sitemap / cards / canonical 404s. Normalizing here fixes all of them in
    // one place — sitemap, list cards, canonical and lookup all agree.
    return j.items.map(it => ({ ...it, slug: normalizeSlug(it.slug) }))
  } catch {
    return []
  }
}

// The manifest (~3 MB) is over Next's 2 MB Data Cache limit, so a plain
// fetch was re-downloaded and re-parsed on every render of /arenda, of every
// villa/apartment page with the comparison block and of the consultant.
// Lists and comparisons never show `notes` (42% of the bytes), so they get a
// slim copy that fits the cache; only the detail page reads the full record.
const loadSlimRental = unstable_cache(
  async (): Promise<RentalItem[]> => (await loadRawRental()).map(it => ({ ...it, notes: null })),
  ['rental-slim-v1'],
  { revalidate: 86400, tags: ['content:rental'] },
)

const loadFullRentalBySlug = unstable_cache(
  async (slug: string): Promise<RentalItem | null> => (await loadRawRental()).find(r => r.slug === slug) ?? null,
  ['rental-item-v1'],
  { revalidate: 3600, tags: ['content:rental'] },
)

// Returns every rental in the manifest, including ones added long ago —
// without `notes` (see loadSlimRental). Use for lists, analytics and
// comparison contexts where stale data is still useful.
export async function loadAllRental(lang: Lang = 'ru'): Promise<RentalItem[]> {
  const items = await loadSlimRental()
  if (lang === 'ru' || items.length === 0) return items
  const cache = await loadTranslations('rental', lang)
  return items.map(item => applyManifestTranslation(item, cache, ['title'] as const))
}

// The freshest non-empty slice of the manifest — for the /arenda catalog only.
// Walks FRESH_WINDOW_LADDER_DAYS from tightest to widest and returns the first
// window that actually holds listings, falling back to everything we have.
export async function loadFreshRental(lang: Lang = 'ru'): Promise<RentalItem[]> {
  const all = await loadAllRental(lang)
  const now = Date.now()
  for (const days of FRESH_WINDOW_LADDER_DAYS) {
    const within = all.filter(it => withinDays(it, days, now))
    if (within.length > 0) return within
  }
  return all
}

// Recent enough to be a meaningful benchmark on a villa/apartment page.
export async function loadCompareRental(lang: Lang = 'ru'): Promise<RentalItem[]> {
  const all = await loadAllRental(lang)
  const now = Date.now()
  return all.filter(it => withinDays(it, COMPARE_WINDOW_DAYS, now))
}

// Detail page lookup — works for every slug we ever published, even if the
// listing is years old. Old detail pages are kept alive for SEO and for
// links coming from the comparison blocks on villa/apartment pages.
export async function loadRentalBySlug(slug: string, lang: Lang = 'ru'): Promise<RentalItem | null> {
  const item = await loadFullRentalBySlug(normalizeSlug(slug))
  if (!item || lang === 'ru') return item
  const cache = await loadTranslations('rental', lang)
  return applyManifestTranslation(item, cache, EN_FIELDS)
}
