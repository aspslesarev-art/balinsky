import { NextResponse } from 'next/server'
import { hasPlanAccess } from '@/lib/plan/access'
import { SecretaryCapReached, draftFor } from '@/lib/plan/secretary'

// «Что ему написать?» — черновик сообщения для одного чата по кнопке на
// дашборде. Один вызов ИИ под общим потолком. Сам текст никуда не
// отправляется: его правит и отправляет владелец.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90

export async function POST(req: Request) {
  if (!(await hasPlanAccess())) return NextResponse.json({ ok: false }, { status: 401 })

  let body: { chat_id?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }
  const chatId = typeof body.chat_id === 'number' && Number.isSafeInteger(body.chat_id) ? body.chat_id : null
  if (chatId === null) return NextResponse.json({ ok: false, error: 'bad_chat' }, { status: 400 })

  try {
    const draft = await draftFor(chatId)
    return NextResponse.json({ ok: true, draft })
  } catch (e) {
    if (e instanceof SecretaryCapReached) return NextResponse.json({ ok: false, error: 'cap' }, { status: 429 })
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'chat_not_found') return NextResponse.json({ ok: false, error: 'chat_not_found' }, { status: 404 })
    console.error('[plan-draft]', msg)
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
