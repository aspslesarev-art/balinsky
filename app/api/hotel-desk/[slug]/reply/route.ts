import { NextResponse } from 'next/server'
import { requireDesk } from '@/lib/hotel/auth'
import { addMessage, ensureOpenStay, markRead, roomById, stayById } from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY = 2000

// POST /api/hotel-desk/:slug/reply — ответ гостю.
// Можно писать и в номер, из которого ещё не писали (roomId): стойка первой
// пишет «ваш трансфер подан» — смена заводится тем же ленивым путём.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hotel = await requireDesk(slug)
  if (!hotel) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { stayId?: number; roomId?: number; text?: string; staffName?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const text = (body.text ?? '').trim()
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 })
  if (text.length > MAX_BODY) return NextResponse.json({ error: 'too_long' }, { status: 413 })

  let stay = body.stayId ? await stayById(hotel.id, body.stayId) : null
  if (!stay && body.roomId) {
    const room = await roomById(hotel.id, body.roomId)
    if (room) stay = await ensureOpenStay(room)
  }
  if (!stay || stay.closed_at) return NextResponse.json({ error: 'no_stay' }, { status: 404 })

  const message = await addMessage({
    stay, author: 'staff', body: text, staffName: (body.staffName ?? '').trim() || null,
  })
  // Персонал отвечает — значит, сообщения гостя он прочитал.
  await markRead(stay.id, 'staff')
  return NextResponse.json({ ok: true, message, stayId: stay.id })
}
