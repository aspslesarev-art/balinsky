import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createHotspot } from '@/lib/complex-visualizations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/admin/visualizations/hotspots — create a hotspot.
// Body: { layerId, label?, polygon: [[x,y],...], targetType: 'layer'|'unit',
//         targetLayerId?, targetUnitKind?, targetUnitSlug? }
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: {
    layerId?: number
    label?: string | null
    polygon?: [number, number][]
    targetType?: 'layer' | 'unit'
    targetLayerId?: number | null
    targetUnitKind?: 'villa' | 'apartment' | null
    targetUnitSlug?: string | null
    availability?: 'free' | 'reserved' | 'sold' | null
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (typeof body.layerId !== 'number') return NextResponse.json({ error: 'layerId_required' }, { status: 400 })
  if (!Array.isArray(body.polygon) || body.polygon.length < 3) {
    return NextResponse.json({ error: 'polygon_required' }, { status: 400 })
  }
  if (body.targetType !== 'layer' && body.targetType !== 'unit') {
    return NextResponse.json({ error: 'bad_targetType' }, { status: 400 })
  }
  const hotspot = await createHotspot({
    layerId: body.layerId,
    label: body.label ?? null,
    polygon: body.polygon,
    targetType: body.targetType,
    targetLayerId: body.targetLayerId ?? null,
    targetUnitKind: body.targetUnitKind ?? null,
    targetUnitSlug: body.targetUnitSlug ?? null,
    availability: body.availability ?? null,
  })
  return NextResponse.json({ hotspot })
}
