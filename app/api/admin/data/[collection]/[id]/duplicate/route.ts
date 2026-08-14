import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCollection } from '@/lib/admin/collections'
import { adapterFor } from '@/lib/admin/adapters'
import { getPhotos, setPhotos } from '@/lib/admin/photos'
import { revalidateCollection } from '@/lib/admin/revalidate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ collection: string; id: string }> }

// POST /api/admin/data/[collection]/[id]/duplicate — Airtable's "Duplicate
// record". Unit types repeat across a complex with only the price changing, so
// copying a row beats re-typing nine fields.
//
// Everything is copied EXCEPT what has to stay unique: the primary key (the
// adapter mints a new one) and the slug, which is re-derived so the copy gets
// its own reachable URL instead of shadowing the original. Photos are copied
// too — same unit type, same renders.
export async function POST(_req: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection, id } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  if (!cfg.caps.create) return NextResponse.json({ error: 'create_not_allowed' }, { status: 403 })

  try {
    const adapter = adapterFor(cfg)
    const source = await adapter.get(cfg, id)
    if (!source) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const skip = new Set<string>([
      ...(cfg.duplicateSkip ?? []),
      ...(cfg.slugField ? [cfg.slugField] : []),
      cfg.primaryKey ?? 'airtable_id',
      'slug',
    ])
    const fields = Object.fromEntries(
      Object.entries(source.fields).filter(([k]) => !skip.has(k)),
    )

    const row = await adapter.create(cfg, fields)

    // Photos live outside the record (a Storage manifest keyed by id), so they
    // need their own copy step. A failure here leaves a photo-less copy, which
    // is recoverable — it must not fail the duplication itself.
    if (cfg.photo) {
      try {
        const photos = await getPhotos(cfg, id)
        if (photos.length) await setPhotos(cfg, row.id, photos)
      } catch (e) {
        console.error(`[duplicate] photos ${cfg.key}/${id}:`, e instanceof Error ? e.message : e)
      }
    }

    await revalidateCollection(cfg, row.id)
    return NextResponse.json({ row })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'duplicate_failed' }, { status: 500 })
  }
}
