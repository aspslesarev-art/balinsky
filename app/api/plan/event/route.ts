import { NextResponse } from 'next/server'
import { hasPlanAccess } from '@/lib/plan/access'
import { setGuestStatus } from '@/lib/plan/event'

// Владелец поправил статус гостя мероприятия. После этого ИИ статус не трогает.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = new Set(['invited', 'interested', 'yes', 'no'])

export async function POST(req: Request) {
  if (!(await hasPlanAccess())) return NextResponse.json({ ok: false }, { status: 401 })

  let body: { chat_id?: unknown; status?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }
  const chatId = typeof body.chat_id === 'number' && Number.isSafeInteger(body.chat_id) ? body.chat_id : null
  const status = typeof body.status === 'string' && STATUSES.has(body.status) ? body.status as 'invited' | 'interested' | 'yes' | 'no' : null
  if (chatId === null || status === null) return NextResponse.json({ ok: false, error: 'bad_guest' }, { status: 400 })

  try {
    await setGuestStatus(chatId, status)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'write_failed' }, { status: 500 })
  }
}
