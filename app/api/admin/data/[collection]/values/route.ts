import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCollection } from '@/lib/admin/collections'
import { distinctFieldValues } from '@/lib/admin/field-values'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/data/[collection]/values?field=Статус → { values: string[] }
// Choices for enum / multienum pickers, taken from the values already in use.
export async function GET(req: Request, { params }: { params: Promise<{ collection: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })

  const field = new URL(req.url).searchParams.get('field')?.trim()
  if (!field) return NextResponse.json({ error: 'field_required' }, { status: 400 })

  try {
    return NextResponse.json({ values: await distinctFieldValues(cfg, field) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'values_failed' }, { status: 500 })
  }
}
