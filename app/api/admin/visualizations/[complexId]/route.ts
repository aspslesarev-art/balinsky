import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  listLayers, listHotspots, listUnitsForComplex, getComplexHeader,
} from '@/lib/complex-visualizations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/visualizations/:complexId
// Returns the full editor payload for one complex: header, all layers,
// all hotspots across those layers, and the candidate units pool the
// hotspot target-picker needs.
export async function GET(_req: Request, { params }: { params: Promise<{ complexId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { complexId } = await params
  const [header, layers, units] = await Promise.all([
    getComplexHeader(complexId),
    listLayers(complexId),
    listUnitsForComplex(complexId),
  ])
  if (!header) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const hotspots = layers.length > 0 ? await listHotspots(layers.map(l => l.id)) : []
  return NextResponse.json({ header, layers, hotspots, units })
}
