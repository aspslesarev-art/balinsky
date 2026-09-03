import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sbAdmin } from '@/lib/market/apply'
import { createListingsForGaps, loadCatalogGaps } from '@/lib/market/catalog-gaps'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Заведение пачки карточек с копированием фото у каждой — не секундное дело.
export const maxDuration = 300

// GET /api/admin/market-gaps — чего из прайсов нет на сайте.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    return NextResponse.json({ gaps: await loadCatalogGaps(sbAdmin()) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'gaps_failed' }, { status: 500 })
  }
}

// POST /api/admin/market-gaps — завести карточки.
// Body: { complex, kind, offers? }. Пустой `offers` означает «все недостающие
// этого комплекса и вида»: смешанный комплекс приходит в отчёт двумя строками.
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { complex?: string; kind?: string; offers?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const complex = String(body.complex ?? '').trim()
  if (!complex) return NextResponse.json({ error: 'complex_required' }, { status: 400 })
  const kind = body.kind === 'villa' ? 'villa' : 'apartment'

  try {
    const result = await createListingsForGaps(sbAdmin(), complex, kind, body.offers ?? [])
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'create_failed' }, { status: 500 })
  }
}
