// Server-side IO for listing georeference: read the current pin + masterplan
// placement, write it back, and take the masterplan upload.
//
// Server-only — pulls the service-role client. The pure types and parsers live
// in lib/geo-placement.ts so client map code can share them.

import { adminSb } from './admin/sb'
import { cdnBucketBase } from './photo-cdn'
import {
  GEO_LAT_FIELD,
  GEO_LNG_FIELD,
  GEO_OVERLAY_FIELD,
  isPlausibleCoord,
  readGeoPlacement,
  type GeoOverlay,
  type GeoPlacement,
} from './geo-placement'

// Reuses the visualisation bucket (already public-read / service-role-write)
// under its own prefix, rather than standing up a second bucket + policies for
// what is at most one image per listing.
const IMAGE_BUCKET = 'viz-photos'
const IMAGE_PREFIX = '_geo'
const PUBLIC_BASE = cdnBucketBase(IMAGE_BUCKET)

export const GEO_TABLES = {
  complexes: 'raw_complexes',
  villas: 'raw_villas',
  apartments: 'raw_apartments',
} as const

export type GeoCollection = keyof typeof GEO_TABLES

export function isGeoCollection(v: string): v is GeoCollection {
  return Object.prototype.hasOwnProperty.call(GEO_TABLES, v)
}

export type GeoRow = GeoPlacement & {
  id: string
  title: string
  district: string | null
}

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

export async function loadGeoRow(collection: GeoCollection, id: string): Promise<GeoRow | null> {
  const { data, error } = await adminSb()
    .from(GEO_TABLES[collection])
    .select('airtable_id, data')
    .eq('airtable_id', id)
    .maybeSingle()

  if (error) {
    console.error('[geo] load', collection, id, error.message)
    return null
  }
  if (!data) return null

  const raw = (data.data ?? {}) as Record<string, unknown>
  return {
    id: data.airtable_id as string,
    // Complexes title themselves with 'Project'; villas and apartments use
    // 'Name'. Neither table has both, so try both before falling back to the id.
    title: firstString(raw['Project']) ?? firstString(raw['Name']) ?? (data.airtable_id as string),
    district: firstString(raw['Location 2']),
    ...readGeoPlacement(raw),
  }
}

export type SaveGeoInput = {
  lat: number
  lng: number
  overlay: GeoOverlay | null
}

export type SaveGeoResult = { ok: true } | { ok: false; error: string }

/**
 * Merge the placement into the row's JSONB `data`.
 *
 * Coordinates go back in whatever shape Airtable left on that row — villas hold
 * a one-element array of strings, complexes hold a bare string. Readers tolerate
 * both, but rewriting the shape would make the edited row the odd one out in its
 * own table, so the existing shape is preserved instead.
 */
function sameShapeAs(existing: unknown, value: number): unknown {
  const text = value.toFixed(6)
  return Array.isArray(existing) ? [text] : text
}

export async function saveGeoPlacement(
  collection: GeoCollection,
  id: string,
  input: SaveGeoInput,
): Promise<SaveGeoResult> {
  if (!isPlausibleCoord(input.lat, input.lng)) {
    return { ok: false, error: 'coords_out_of_range' }
  }

  const sb = adminSb()
  const { data: row, error: readError } = await sb
    .from(GEO_TABLES[collection])
    .select('data')
    .eq('airtable_id', id)
    .maybeSingle()

  if (readError) return { ok: false, error: readError.message }
  if (!row) return { ok: false, error: 'not_found' }

  const current = (row.data ?? {}) as Record<string, unknown>
  const next: Record<string, unknown> = {
    ...current,
    [GEO_LAT_FIELD]: sameShapeAs(current[GEO_LAT_FIELD], input.lat),
    [GEO_LNG_FIELD]: sameShapeAs(current[GEO_LNG_FIELD], input.lng),
  }
  if (input.overlay) next[GEO_OVERLAY_FIELD] = input.overlay
  else delete next[GEO_OVERLAY_FIELD]

  const { error: writeError } = await sb
    .from(GEO_TABLES[collection])
    .update({ data: next })
    .eq('airtable_id', id)

  if (writeError) {
    console.error('[geo] save', collection, id, writeError.message)
    return { ok: false, error: writeError.message }
  }
  return { ok: true }
}

export async function uploadOverlayImage(opts: {
  collection: GeoCollection
  id: string
  filename: string
  buf: Buffer
  contentType: string
}): Promise<string | null> {
  const safeName = opts.filename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'masterplan'
  const key = `${IMAGE_PREFIX}/${opts.collection}/${opts.id}/${Date.now()}-${safeName}`

  const { error } = await adminSb().storage.from(IMAGE_BUCKET).upload(key, opts.buf, {
    contentType: opts.contentType,
    upsert: false,
    cacheControl: '604800',
  })
  if (error) {
    console.error('[geo] upload', key, error.message)
    return null
  }
  return `${PUBLIC_BASE}/${key}`
}
