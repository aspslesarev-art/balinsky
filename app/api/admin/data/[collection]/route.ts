import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCollection } from '@/lib/admin/collections'
import { adapterFor } from '@/lib/admin/adapters'
import { revalidateCollection } from '@/lib/admin/revalidate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/data/[collection] — grid rows (showInGrid fields only).
export async function GET(req: Request, { params }: { params: Promise<{ collection: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })

  const url = new URL(req.url)
  const sortField = url.searchParams.get('sort')
  const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
  const sort = sortField ? { field: sortField, dir: dir as 'asc' | 'desc' } : undefined

  try {
    const { rows, total } = await adapterFor(cfg).list(cfg, { sort })
    return NextResponse.json({ rows, total })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'list_failed' }, { status: 500 })
  }
}

// POST /api/admin/data/[collection] — create a record. Body: { fields }.
export async function POST(req: Request, { params }: { params: Promise<{ collection: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  if (!cfg.caps.create) return NextResponse.json({ error: 'create_not_allowed' }, { status: 403 })

  let body: { fields?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const fields = body.fields ?? {}
  try {
    const row = await adapterFor(cfg).create(cfg, fields)
    revalidateCollection(cfg)
    return NextResponse.json({ row })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'create_failed' }, { status: 500 })
  }
}
