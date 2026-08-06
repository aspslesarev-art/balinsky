// Georeference for a listing: the exact pin plus an optional masterplan image
// pinned onto the satellite view. Pure types + parsing only — no IO, no
// service-role client, so both the public detail pages (server) and the map
// components (client) can import it.
//
// Storage lives in the existing JSONB `data` column, alongside the Airtable-era
// field names: 'Geo' (lat) / 'Geo 2' (lng) already drive every map on the site,
// and 'Geo Overlay' is the new sibling. Keeping it in `data` means the edit
// rides the normal admin invalidation path instead of needing its own manifest
// fetch on a page that already loads the row.

export const GEO_LAT_FIELD = 'Geo'
export const GEO_LNG_FIELD = 'Geo 2'
export const GEO_OVERLAY_FIELD = 'Geo Overlay'

/** Real-world placement of the masterplan image over the satellite tiles. */
export type GeoOverlay = {
  imageUrl: string
  /** Width of the image on the ground, in metres. Height follows the aspect ratio. */
  widthM: number
  /** Clockwise rotation from north, degrees. */
  rotationDeg: number
  /** 0..1 — how much satellite shows through while aligning. */
  opacity: number
}

export type GeoPlacement = {
  lat: number | null
  lng: number | null
  overlay: GeoOverlay | null
}

export const OVERLAY_LIMITS = {
  widthM: [5, 3000],
  rotationDeg: [0, 360],
  opacity: [0, 1],
} as const

export const DEFAULT_OVERLAY: Omit<GeoOverlay, 'imageUrl'> = {
  widthM: 150,
  rotationDeg: 0,
  opacity: 0.6,
}

/** Bali plus the outer islands we actually list on (Sumba, Lombok, Nusa Penida). */
export const GEO_BOUNDS = { minLat: -11, maxLat: -5, minLng: 112, maxLng: 121 } as const

export function isPlausibleCoord(lat: number, lng: number): boolean {
  return lat >= GEO_BOUNDS.minLat && lat <= GEO_BOUNDS.maxLat
    && lng >= GEO_BOUNDS.minLng && lng <= GEO_BOUNDS.maxLng
}

/**
 * Airtable wrote these as `["-8.641934"]` on some rows and as a bare string on
 * others, so every reader in the codebase tolerates both shapes. Mirror that
 * here rather than assuming one — see numberOrNull in the detail pages.
 */
export function parseGeoNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, ''))
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return parseGeoNumber(v[0])
  if (v && typeof v === 'object' && 'value' in v) {
    return parseGeoNumber((v as { value: unknown }).value)
  }
  return null
}

function clamp(v: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, v))
}

/** Untrusted input (JSONB row or request body) → a valid overlay, or null. */
export function parseGeoOverlay(v: unknown): GeoOverlay | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const raw = v as Record<string, unknown>

  const imageUrl = typeof raw.imageUrl === 'string' ? raw.imageUrl.trim() : ''
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return null

  const widthM = Number(raw.widthM)
  if (!Number.isFinite(widthM)) return null

  const rotationDeg = Number(raw.rotationDeg)
  const opacity = Number(raw.opacity)

  return {
    imageUrl,
    widthM: clamp(widthM, OVERLAY_LIMITS.widthM),
    rotationDeg: Number.isFinite(rotationDeg) ? ((rotationDeg % 360) + 360) % 360 : DEFAULT_OVERLAY.rotationDeg,
    opacity: Number.isFinite(opacity) ? clamp(opacity, OVERLAY_LIMITS.opacity) : DEFAULT_OVERLAY.opacity,
  }
}

/** Read the whole placement out of a raw_* `data` object. */
export function readGeoPlacement(data: Record<string, unknown> | null | undefined): GeoPlacement {
  if (!data) return { lat: null, lng: null, overlay: null }
  return {
    lat: parseGeoNumber(data[GEO_LAT_FIELD]),
    lng: parseGeoNumber(data[GEO_LNG_FIELD]),
    overlay: parseGeoOverlay(data[GEO_OVERLAY_FIELD]),
  }
}

/** Metres per degree of latitude — good enough at Bali's scale. */
const M_PER_DEG_LAT = 111_320

export function metresToLatDelta(metres: number): number {
  return metres / M_PER_DEG_LAT
}

export function metresToLngDelta(metres: number, atLat: number): number {
  const scale = Math.cos((atLat * Math.PI) / 180)
  if (scale < 1e-6) return 0
  return metres / (M_PER_DEG_LAT * scale)
}
