// Vision-derived listing features + photo alt text, produced by
// scripts/kb-vision.mjs into <bucket>/_vision.json. Powers new catalog filters
// (feature flags) and image SEO/accessibility (alt text). Read from Storage
// (ISR-cached), no DB.

import type { Lang } from '@/lib/i18n'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export type VisionFeatures = {
  pool?: boolean
  pool_type?: 'infinity' | 'private' | 'shared' | null
  view?: string[]
  outdoor?: string[]
  amenities?: string[]
  style?: string | null
  condition?: 'new' | 'good' | 'dated' | null
  furnished?: boolean
}
export type VisionEntry = { features: VisionFeatures; alt_ru: string[]; alt_en: string[] }
export type VisionManifest = Record<string, VisionEntry>

export type FeatureKind = 'villa' | 'apartment' | 'complex'
const BUCKET: Record<FeatureKind, string> = {
  villa: 'villa-photos', apartment: 'apartment-photos', complex: 'complex-photos',
}

// Canonical filter flags derived from the raw feature object. Keep keys STABLE —
// they appear in URLs / filter state. Limited to DISCRIMINATING signals: e.g.
// 'furnished' is ~99% true across the catalog (useless as a filter) and
// gym/coworking are near-zero, so they're intentionally excluded.
export const FEATURE_FLAGS = [
  'pool', 'infinity_pool', 'ocean_view', 'jungle_view', 'rice_view', 'jacuzzi',
] as const
export type FeatureFlag = (typeof FEATURE_FLAGS)[number]

export const FEATURE_LABELS: Record<FeatureFlag, { ru: string; en: string }> = {
  pool: { ru: 'Бассейн', en: 'Pool' },
  infinity_pool: { ru: 'Инфинити-бассейн', en: 'Infinity pool' },
  ocean_view: { ru: 'Вид на океан', en: 'Ocean view' },
  jungle_view: { ru: 'Вид на джунгли', en: 'Jungle view' },
  rice_view: { ru: 'Вид на рисовые поля', en: 'Rice-field view' },
  jacuzzi: { ru: 'Джакузи', en: 'Jacuzzi' },
}

export function featureFlags(f: VisionFeatures | undefined | null): FeatureFlag[] {
  if (!f) return []
  const out: FeatureFlag[] = []
  if (f.pool) out.push('pool')
  if (f.pool_type === 'infinity') out.push('infinity_pool')
  const view = f.view ?? []
  if (view.includes('ocean')) out.push('ocean_view')
  if (view.includes('jungle')) out.push('jungle_view')
  if (view.includes('rice_field')) out.push('rice_view')
  if ((f.amenities ?? []).includes('jacuzzi')) out.push('jacuzzi')
  return out
}

const _cache = new Map<FeatureKind, { ts: number; data: VisionManifest }>()
const TTL = 5 * 60 * 1000

export async function loadVisionManifest(kind: FeatureKind): Promise<VisionManifest> {
  const hit = _cache.get(kind)
  if (hit && Date.now() - hit.ts < TTL) return hit.data
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET[kind]}/_vision.json`
    const r = await fetch(url, { next: { revalidate: 3600, tags: [`vision:${kind}`] } })
    if (!r.ok) return _cache.get(kind)?.data ?? {}
    const data = (await r.json()) as VisionManifest
    _cache.set(kind, { ts: Date.now(), data })
    return data
  } catch {
    return _cache.get(kind)?.data ?? {}
  }
}

// Per-listing flags map for a whole catalog page: airtable_id -> FeatureFlag[].
export async function loadFeatureFlagsMap(kind: FeatureKind): Promise<Record<string, FeatureFlag[]>> {
  const man = await loadVisionManifest(kind)
  const out: Record<string, FeatureFlag[]> = {}
  for (const [id, entry] of Object.entries(man)) out[id] = featureFlags(entry.features)
  return out
}

// One listing's vision entry (features + alts). Uses the ISR-cached manifest.
export async function loadListingVision(kind: FeatureKind, airtableId: string | null | undefined): Promise<VisionEntry | null> {
  if (!airtableId) return null
  const man = await loadVisionManifest(kind)
  return man[airtableId] ?? null
}

export function altFor(entry: VisionEntry | undefined | null, index: number, lang: Lang, fallback: string): string {
  if (!entry) return fallback
  const arr = lang === 'en' ? entry.alt_en : entry.alt_ru
  const a = arr?.[index]
  return (typeof a === 'string' && a.trim()) ? a.trim() : fallback
}
