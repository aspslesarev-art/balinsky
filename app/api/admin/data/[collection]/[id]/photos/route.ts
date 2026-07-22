import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCollection } from '@/lib/admin/collections'
import { getPhotos, setPhotos } from '@/lib/admin/photos'
import { revalidateCollection } from '@/lib/admin/revalidate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ collection: string; id: string }> }

// GET — current photo URLs for a record.
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection, id } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  if (!cfg.photo) return NextResponse.json({ error: 'no_photo_bucket' }, { status: 400 })
  try {
    return NextResponse.json({ photos: await getPhotos(cfg, id) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'get_failed' }, { status: 500 })
  }
}

// PUT — replace the full ordered photo list (add / remove / reorder). Body: { photos: string[] }.
export async function PUT(req: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection, id } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  if (!cfg.photo) return NextResponse.json({ error: 'no_photo_bucket' }, { status: 400 })

  let body: { photos?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const photos = Array.isArray(body.photos) ? body.photos.filter((u): u is string => typeof u === 'string') : null
  if (!photos) return NextResponse.json({ error: 'photos_array_required' }, { status: 400 })
  try {
    await setPhotos(cfg, id, photos)
    await revalidateCollection(cfg, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'save_failed' }, { status: 500 })
  }
}
