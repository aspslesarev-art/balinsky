import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCollection } from '@/lib/admin/collections'
import { uploadToBucket } from '@/lib/admin/photos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/admin/data/[collection]/upload — multipart form-data with `file`.
// Uploads to the collection's photo bucket, returns { url }. The client then
// persists the URL into the record's manifest via PUT .../[id]/photos.
export async function POST(req: Request, { params }: { params: Promise<{ collection: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  const bucket = cfg.photo?.bucket ?? cfg.uploadBucket
  if (!bucket) return NextResponse.json({ error: 'no_bucket' }, { status: 400 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 })
  const buf = Buffer.from(await file.arrayBuffer())
  try {
    const url = await uploadToBucket(bucket, { filename: file.name, buf, contentType: file.type || 'image/jpeg' })
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'upload_failed' }, { status: 500 })
  }
}
