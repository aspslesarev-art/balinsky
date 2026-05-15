import { applyManifestTranslation, loadEnTranslations } from '@/lib/en-translations'
import type { Lang } from '@/lib/i18n'

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

// Listings older than FRESH_WINDOW drop out of the /arenda catalog so the
// page doesn't fill up with stale offers nobody can rent any more.
// Detail pages (/arenda/o/<slug>) and the villa-page comparison block use
// wider windows so links stay alive and old prices keep doing SEO duty.
const FRESH_WINDOW_DAYS = 30
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

function isFresh(item: RentalItem, now: number): boolean {
  return withinDays(item, FRESH_WINDOW_DAYS, now)
}

async function loadRawRental(): Promise<RentalItem[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:rental'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    return Array.isArray(j.items) ? j.items : []
  } catch {
    return []
  }
}

// Returns every rental in the manifest, including ones added long ago.
// Use for analytics / comparison contexts where stale data is still useful.
export async function loadAllRental(lang: Lang = 'ru'): Promise<RentalItem[]> {
  const items = await loadRawRental()
  if (lang === 'ru' || items.length === 0) return items
  const cache = await loadEnTranslations('rental')
  return items.map(item => applyManifestTranslation(item, cache, EN_FIELDS))
}

// Listings created within FRESH_WINDOW_DAYS — for the /arenda catalog only.
export async function loadFreshRental(lang: Lang = 'ru'): Promise<RentalItem[]> {
  const all = await loadAllRental(lang)
  const now = Date.now()
  return all.filter(it => isFresh(it, now))
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
  const all = await loadAllRental(lang)
  return all.find(r => r.slug === slug) ?? null
}
