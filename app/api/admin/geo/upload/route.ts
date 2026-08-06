import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { isGeoCollection, uploadOverlayImage } from '@/lib/complex-geo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 12 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']

// POST /api/admin/geo/upload — multipart form-data with `file`, `collection`
// and `id`. Returns { url } for the masterplan image the editor then pins to
// the satellite view. PNG is the useful case: a transparent background lets the
// admin see the satellite through the plan while aligning it.
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 })

  const file = form.get('file')
  const collection = form.get('collection')
  const id = form.get('id')
  if (!(file instanceof File) || typeof collection !== 'string' || typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (!isGeoCollection(collection)) return NextResponse.json({ error: 'bad_collection' }, { status: 400 })

  const contentType = file.type || 'image/png'
  if (!ALLOWED.includes(contentType)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'too_large' }, { status: 413 })

  const url = await uploadOverlayImage({
    collection,
    id,
    filename: file.name,
    buf: Buffer.from(await file.arrayBuffer()),
    contentType,
  })
  if (!url) return NextResponse.json({ error: 'upload_failed' }, { status: 500 })

  return NextResponse.json({ url })
}
