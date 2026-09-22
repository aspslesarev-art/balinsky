import { NextResponse } from 'next/server'
import { currentAdminUsername, requireAdmin } from '@/lib/admin-auth'
import { decidePair } from '@/lib/dev-crm/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Решение по спорной паре: «одна компания» (склеить) или «разные»
// (больше не спрашивать).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  try {
    const { decision, keep } = await req.json() as { decision?: string; keep?: string }
    if (decision !== 'merged' && decision !== 'distinct') {
      return NextResponse.json({ ok: false, error: 'bad_decision' }, { status: 400 })
    }
    await decidePair(id, decision, await currentAdminUsername(), keep === 'right' ? 'right' : 'left')
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'pair_not_found') return NextResponse.json({ ok: false, error: msg }, { status: 404 })
    console.error('[dev-crm] decide', e)
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 })
  }
}
