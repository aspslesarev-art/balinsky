import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCollection } from '@/lib/admin/collections'
import { revalidateCollection } from '@/lib/admin/revalidate'
import { isGeoCollection, loadGeoRow, saveGeoPlacement } from '@/lib/complex-geo'
import { isPlausibleCoord, parseGeoOverlay, type GeoOverlay } from '@/lib/geo-placement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ collection: string; id: string }> }

// GET /api/admin/geo/:collection/:id — current pin + masterplan placement.
export async function GET(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection, id } = await params
  if (!isGeoCollection(collection)) return NextResponse.json({ error: 'bad_collection' }, { status: 400 })

  const row = await loadGeoRow(collection, id)
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(row)
}

type ParsedBody = { lat: number; lng: number; overlay: GeoOverlay | null }

/**
 * The overlay sub-object is validated by parseGeoOverlay (it clamps width,
 * normalises rotation, and rejects a non-http image URL). Coordinates are
 * checked here: anything outside the archipelago is a mis-drag or a swapped
 * lat/lng, and silently persisting it is how a pin ends up in the Atlantic.
 */
function parseBody(body: unknown): ParsedBody | string {
  if (!body || typeof body !== 'object') return 'body must be an object'
  const raw = body as Record<string, unknown>

  const lat = Number(raw.lat)
  const lng = Number(raw.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'lat and lng must be numbers'
  if (!isPlausibleCoord(lat, lng)) return 'coordinates are outside the covered region'

  return { lat, lng, overlay: parseGeoOverlay(raw.overlay) }
}

// PUT /api/admin/geo/:collection/:id — save pin + masterplan placement.
export async function PUT(req: Request, { params }: Params) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection, id } = await params
  if (!isGeoCollection(collection)) return NextResponse.json({ error: 'bad_collection' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = parseBody(body)
  if (typeof parsed === 'string') return NextResponse.json({ error: parsed }, { status: 400 })

  const saved = await saveGeoPlacement(collection, id, parsed)
  if (!saved.ok) {
    const status = saved.error === 'not_found' ? 404 : 500
    return NextResponse.json({ error: saved.error }, { status })
  }

  // Coordinates feed the detail map, the catalog maps and the nearby-places
  // blocks, so the edit has to flush the same three layers as any admin write.
  const cfg = getCollection(collection)
  if (cfg) await revalidateCollection(cfg, id)

  return NextResponse.json({ ok: true })
}
