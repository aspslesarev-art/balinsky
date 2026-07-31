// Applies the photo audit (scripts/kb-photo-audit.mjs → <bucket>/_vision.json,
// key `audit`) to a listing's photo list: the chosen cover moves to the front
// and rejected shots (duplicates, screenshots, documents, watermarked, dark,
// blurry) are dropped.
//
// The alt texts in a VisionEntry are positional — alt_ru[i] describes photo i
// of the ORIGINAL order — so reordering the photos without reordering the alts
// would silently mislabel every image. Both are permuted together here.

import type { VisionEntry } from '@/lib/listing-features'

export interface PhotoAudit {
  cover?: number
  cover_reason?: string | null
  reject?: { i: number; reason: string }[]
  mismatch?: { flag: boolean; note: string | null }
  at?: string
}

export interface CuratedPhotos {
  photos: string[]
  /** Same entry with alt_ru/alt_en permuted to match `photos`. */
  vision: VisionEntry | null
}

// Keep at least this many photos: if the audit would strip a listing down to
// almost nothing, showing flawed photos beats showing an empty gallery.
const MIN_PHOTOS = 3

function auditOf(vision: VisionEntry | null | undefined): PhotoAudit | null {
  const a = (vision as (VisionEntry & { audit?: PhotoAudit }) | null | undefined)?.audit
  return a && typeof a === 'object' ? a : null
}

/** Order of original indices to display: cover first, rejects removed. */
function displayOrder(count: number, audit: PhotoAudit): number[] {
  const all = Array.from({ length: count }, (_, i) => i)

  const rejected = new Set(
    (audit.reject ?? []).map(r => r.i).filter(i => Number.isInteger(i) && i >= 0 && i < count),
  )
  const kept = count - rejected.size >= MIN_PHOTOS ? all.filter(i => !rejected.has(i)) : all

  const cover = audit.cover
  if (!Number.isInteger(cover) || !kept.includes(cover as number)) return kept
  return [cover as number, ...kept.filter(i => i !== cover)]
}

const permute = <T,>(arr: T[] | undefined, order: number[]): T[] | undefined =>
  Array.isArray(arr) ? order.map(i => arr[i]).filter((v): v is T => v !== undefined) : undefined

/**
 * Reorders a listing's photos per the audit. Returns the original list
 * untouched when there is no audit, so callers can use it unconditionally.
 */
export function curatePhotos(
  photos: readonly string[] | null | undefined,
  vision: VisionEntry | null | undefined,
): CuratedPhotos {
  const list = Array.isArray(photos) ? photos : []
  const audit = auditOf(vision)
  if (!list.length || !audit) return { photos: [...list], vision: vision ?? null }

  const order = displayOrder(list.length, audit)
  return {
    photos: order.map(i => list[i]).filter((u): u is string => typeof u === 'string'),
    vision: vision
      ? { ...vision, alt_ru: permute(vision.alt_ru, order) ?? vision.alt_ru, alt_en: permute(vision.alt_en, order) ?? vision.alt_en }
      : null,
  }
}

/** Cover-only shortcut for catalog cards, which render a single image. */
export function coverPhoto(
  photos: readonly string[] | null | undefined,
  vision: VisionEntry | null | undefined,
): string | null {
  return curatePhotos(photos, vision).photos[0] ?? null
}
