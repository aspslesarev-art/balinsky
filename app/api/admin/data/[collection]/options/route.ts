import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCollection } from '@/lib/admin/collections'
import { getOptions, resolveTitles } from '@/lib/admin/options'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/data/[collection]/options?q=...  → { options: [{id,title}] }
// GET /api/admin/data/[collection]/options?ids=a,b → { titles: {id:title} }
// Used by `link` field pickers to choose / resolve records from this collection.
export async function GET(req: Request, { params }: { params: Promise<{ collection: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  const url = new URL(req.url)
  const ids = url.searchParams.get('ids')
  try {
    if (ids != null) {
      const titles = await resolveTitles(cfg, ids.split(',').map(s => s.trim()).filter(Boolean))
      return NextResponse.json({ titles })
    }
    const options = await getOptions(cfg, url.searchParams.get('q') ?? '')
    return NextResponse.json({ options })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'options_failed' }, { status: 500 })
  }
}
