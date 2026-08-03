import type { CollectionConfig } from './adapters/types'

// Keeps the metre count that is baked into a listing's TEXT in step with the
// `Площадь` number when an editor changes it in /admin/data.
//
// Airtable used to regenerate the derived copy (SEO:Title, ИИ Имя, social and
// aggregator titles, descriptions, post texts — RU and EN alike) whenever the
// area changed. Since Airtable was retired the area is a plain number field and
// nothing recomputes that copy, so a single edit leaves ~25 strings quoting the
// old metreage. That is how the Urban Escape units ended up titled "254 м²"
// while the record said 314.
//
// The rewrite is deliberately narrow: we only touch a number that is *followed
// by an area unit*, so prices, years and bedroom counts can never be hit.
// `SEO:Slug` is excluded on purpose — the slug is the public URL and changing
// it would break links and drop the page out of the index.
//
// NOTE: `scripts/fix-area-texts.mjs` carries the same rewrite for one-off
// backfills of rows that went stale before this guard existed. Keep the two in
// sync if the unit list or the skip list changes.

const AREA_FIELD = 'Площадь'
const PRICE_PER_SQM_FIELD = 'Цена м²'

/** Price column per collection — villas store `price`, apartments `price_usd`. */
const PRICE_FIELDS = ['price', 'price_usd'] as const

/**
 * Fields whose metreage must survive verbatim: the public URL, opaque blobs and
 * anything machine-generated that no visitor reads as a name.
 */
const SKIP_FIELDS = new Set(['SEO:Slug', 'Slug', 'PDF code', 'photos', 'Renders', 'Post ID', 'external_id'])

/** How far `Цена м²` may drift from price/area and still count as derived. */
const DERIVED_PRICE_TOLERANCE = 0.02

type AiField = { state?: string; value?: unknown; isStale?: boolean }

function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').replace(/[^\d.]/g, ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

function isAiField(v: unknown): v is AiField {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'value' in v
}

/** `254 м²`, `254m2`, `254 sqm`, `254 кв. м` — but never a bare `254`. */
function areaPattern(area: number): RegExp {
  const digits = String(area).replace('.', '[.,]')
  return new RegExp(`(?<![\\d.,])${digits}(\\s*)(м²|m²|м2|m2|sqm|кв\\.?\\s?м)`, 'gi')
}

/**
 * A listing's land plot is measured in the same unit and sometimes happens to
 * equal the old built area (BINGIN ELEMENTS: 220 м² land, 220 м² built). Leave
 * a match alone when the words just before it are talking about land.
 */
const LAND_CONTEXT = /(земл|участ|land|plot)/i
const LAND_LOOKBACK = 45

function isLandMention(text: string, offset: number): boolean {
  return LAND_CONTEXT.test(text.slice(Math.max(0, offset - LAND_LOOKBACK), offset))
}

function rewriteText(text: string, pattern: RegExp, nextArea: number): string {
  return text.replace(pattern, (match: string, gap: string, unit: string, offset: number) =>
    isLandMention(text, offset) ? match : `${nextArea}${gap}${unit}`,
  )
}

/** New value for `v`, or `null` when nothing in it mentions the old area. */
function rewriteValue(v: unknown, pattern: RegExp, nextArea: number): unknown | null {
  if (typeof v === 'string') {
    const next = rewriteText(v, pattern, nextArea)
    return next === v ? null : next
  }
  if (Array.isArray(v)) {
    const items = v.map(item => rewriteValue(item, pattern, nextArea) ?? item)
    return items.some((item, i) => item !== v[i]) ? items : null
  }
  if (isAiField(v)) {
    const next = rewriteValue(v.value, pattern, nextArea)
    return next === null ? null : { ...v, value: next }
  }
  return null
}

/**
 * `Цена м²` is a derived figure, but an editor may have typed their own. Only
 * refresh it when the stored value still matches price / old area.
 */
function pricePerSqmPatch(
  current: Record<string, unknown>,
  prevArea: number,
  nextArea: number,
): Record<string, unknown> {
  const price = PRICE_FIELDS.map(key => numberOrNull(current[key])).find(n => n !== null)
  if (price == null) return {}
  const stored = numberOrNull(current[PRICE_PER_SQM_FIELD])
  if (stored == null) return {}
  const derived = price / prevArea
  if (Math.abs(stored - derived) / derived > DERIVED_PRICE_TOLERANCE) return {}
  return { [PRICE_PER_SQM_FIELD]: price / nextArea }
}

/**
 * Extra fields to write alongside an admin patch so the record's copy agrees
 * with its new area. Empty object when the patch does not move the area.
 */
export function areaSyncPatch(
  cfg: CollectionConfig,
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  if (!cfg.fields.some(f => f.key === AREA_FIELD)) return {}
  if (!(AREA_FIELD in patch)) return {}

  const nextArea = numberOrNull(patch[AREA_FIELD])
  const prevArea = numberOrNull(current[AREA_FIELD])
  if (nextArea == null || prevArea == null || nextArea === prevArea) return {}

  const pattern = areaPattern(prevArea)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(current)) {
    if (SKIP_FIELDS.has(key) || key in patch) continue
    const next = rewriteValue(value, pattern, nextArea)
    if (next !== null) out[key] = next
  }
  return { ...out, ...pricePerSqmPatch(current, prevArea, nextArea) }
}
