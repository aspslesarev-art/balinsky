import { NextResponse } from 'next/server'
import { addMessage, ensureOpenStay, resolveRoomByToken, setGuestName } from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY = 2000
const MAX_NAME = 80

// POST /api/stay/:token/message — сообщение гостя персоналу.
// Первое сообщение заводит смену (заезд): пока гость молчит, «заезда» нет.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await resolveRoomByToken(token)
  if (!found) return NextResponse.json({ error: 'unknown_room' }, { status: 404 })

  let body: { text?: string; name?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const text = (body.text ?? '').trim()
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 })
  if (text.length > MAX_BODY) return NextResponse.json({ error: 'too_long' }, { status: 413 })

  const stay = await ensureOpenStay(found.room)
  const name = (body.name ?? '').trim().slice(0, MAX_NAME)
  if (name && name !== stay.guest_name) await setGuestName(found.hotel.id, stay.id, name)

  const message = await addMessage({ stay, author: 'guest', body: text })
  return NextResponse.json({ ok: true, message })
}
