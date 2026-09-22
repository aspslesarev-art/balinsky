import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createPerson } from '@/lib/dev-crm/store'
import { isRole } from '@/lib/dev-crm/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  try {
    const body = await req.json() as { name?: string; role?: string; telegram?: string; tg_chat_id?: number }
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 })
    const person = await createPerson(id, {
      name,
      role: isRole(body.role) ? body.role : 'staff',
      telegram: body.telegram ?? null,
      tg_chat_id: Number.isSafeInteger(body.tg_chat_id) ? body.tg_chat_id : null,
    })
    return NextResponse.json({ ok: true, person })
  } catch (e) {
    console.error('[dev-crm] add person', e)
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('dev_people_tg_chat_id_key')) {
      return NextResponse.json({ ok: false, error: 'chat_taken' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: 'create_failed' }, { status: 500 })
  }
}
