import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { uploadVizPhoto } from '@/lib/complex-visualizations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/admin/visualizations/upload — multipart form-data with
// `file` + `complexId`. Returns { url } on success. The bucket
// `viz-photos` must exist in Supabase Storage (public read, service-
// role write); see the migration comment.
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  const file = form.get('file')
  const complexId = form.get('complexId')
  if (!(file instanceof File) || typeof complexId !== 'string' || !complexId) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const url = await uploadVizPhoto({
    complexAirtableId: complexId,
    filename: file.name,
    buf,
    contentType: file.type || 'image/jpeg',
  })
  if (!url) return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  return NextResponse.json({ url })
}
