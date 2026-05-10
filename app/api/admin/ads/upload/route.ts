import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { uploadBannerPhoto } from '@/lib/banners'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/admin/ads/upload — multipart form-data with `file`.
// Returns { url } pointing at the public Supabase Storage path.
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 })
  const buf = Buffer.from(await file.arrayBuffer())
  try {
    const url = await uploadBannerPhoto({
      filename: file.name,
      buf,
      contentType: file.type || 'image/jpeg',
    })
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'upload_failed' }, { status: 500 })
  }
}
