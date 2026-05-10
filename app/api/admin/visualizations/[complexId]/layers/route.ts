import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createLayer } from '@/lib/complex-visualizations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/admin/visualizations/:complexId/layers — create a new layer.
// Body: { parentLayerId: number | null, title: string | null, photoUrl: string }
export async function POST(req: Request, { params }: { params: Promise<{ complexId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { complexId } = await params
  let body: { parentLayerId?: number | null; title?: string | null; photoUrl?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (!body.photoUrl || typeof body.photoUrl !== 'string') {
    return NextResponse.json({ error: 'photoUrl_required' }, { status: 400 })
  }
  const layer = await createLayer({
    complexAirtableId: complexId,
    parentLayerId: typeof body.parentLayerId === 'number' ? body.parentLayerId : null,
    title: typeof body.title === 'string' ? body.title : null,
    photoUrl: body.photoUrl,
  })
  return NextResponse.json({ layer })
}
