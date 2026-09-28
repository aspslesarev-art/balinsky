import { NextResponse } from 'next/server'
import { hasPlanAccess } from '@/lib/plan/access'
import { setGoal } from '@/lib/plan/dashboard'

// Цель владельца по собеседнику. Пустая строка — снять цель.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await hasPlanAccess())) return NextResponse.json({ ok: false }, { status: 401 })

  let body: { chat_id?: unknown; goal?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }
  const chatId = typeof body.chat_id === 'number' && Number.isSafeInteger(body.chat_id) ? body.chat_id : null
  const goal = typeof body.goal === 'string' ? body.goal : null
  if (chatId === null || goal === null) return NextResponse.json({ ok: false, error: 'bad_goal' }, { status: 400 })

  try {
    await setGoal(chatId, goal)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'write_failed' }, { status: 500 })
  }
}
