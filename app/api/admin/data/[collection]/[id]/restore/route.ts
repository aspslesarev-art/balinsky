import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCollection } from '@/lib/admin/collections'
import { adapterFor } from '@/lib/admin/adapters'
import { revalidateCollection } from '@/lib/admin/revalidate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ collection: string; id: string }> }

// POST /api/admin/data/[collection]/[id]/restore — bring an archived record
// back (softDelete collections only: developers). Its publication flag returns
// to what it was before archiving.
export async function POST(_req: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection, id } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  const adapter = adapterFor(cfg)
  if (!cfg.softDelete || !adapter.restore) return NextResponse.json({ error: 'restore_not_supported' }, { status: 400 })
  try {
    await adapter.restore(cfg, id)
    await revalidateCollection(cfg, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'restore_failed' }, { status: 500 })
  }
}
