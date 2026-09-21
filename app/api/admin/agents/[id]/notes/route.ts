import { NextResponse } from 'next/server'
import { currentAdminUsername, requireAdmin } from '@/lib/admin-auth'
import { addNote } from '@/lib/agents/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  try {
    const { body } = await req.json() as { body?: string }
    const text = (body ?? '').trim()
    if (!text) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 })
    const note = await addNote(id, text.slice(0, 4000), await currentAdminUsername())
    return NextResponse.json({ ok: true, note })
  } catch (e) {
    console.error('[agents] note', e)
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 })
  }
}
