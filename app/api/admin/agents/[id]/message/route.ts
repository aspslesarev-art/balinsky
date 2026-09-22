import { NextResponse } from 'next/server'
import { currentAdminUsername } from '@/lib/admin-auth'
import { getAgent } from '@/lib/agents/store'
import { sendTgBusiness } from '@/lib/tg-business'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Написать агенту из его карточки. Чат берём из самой карточки, а не из
// тела запроса: так из раздела «Агенты» нельзя случайно (или намеренно)
// отправить сообщение в переписку, которая к карточке не привязана.
// Файлы остались в /admin/perepiska — тут только текст.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await currentAdminUsername()
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })

  let body: { text?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4096) : ''
  if (!text) return NextResponse.json({ ok: false, error: 'Пустое сообщение' }, { status: 400 })

  const agent = await getAgent(id)
  if (!agent) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  if (agent.tg_chat_id == null) {
    return NextResponse.json({ ok: false, error: 'Сначала привяжите переписку' }, { status: 400 })
  }

  const res = await sendTgBusiness({ chatId: agent.tg_chat_id, text, file: null, sentBy: admin })
  return NextResponse.json(res, { status: res.ok ? 200 : 502 })
}
