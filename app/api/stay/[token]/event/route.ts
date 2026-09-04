import { NextResponse } from 'next/server'
import { findOpenStay, logEvent, resolveRoomByToken } from '@/lib/hotel/db'
import { isPortalLang } from '@/lib/hotel/i18n'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Что считаем (ТЗ 14.7). Чужие типы не пишем: журнал должен оставаться
// пригодным для подсчёта воронки, а не превращаться в свалку строк.
const ALLOWED = new Set([
  'screen_open', 'category_tap', 'item_tap', 'lang_change', 'messenger_open', 'chat_open',
])

// POST /api/stay/:token/event — действие гостя в журнал.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await resolveRoomByToken(token)
  if (!found) return NextResponse.json({ error: 'unknown_room' }, { status: 404 })

  let body: { type?: string; ctx?: Record<string, unknown>; lang?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body.type || !ALLOWED.has(body.type)) return NextResponse.json({ error: 'bad_type' }, { status: 400 })

  const stay = await findOpenStay(found.room.id)
  await logEvent({
    hotelId: found.hotel.id,
    roomId: found.room.id,
    stayId: stay?.id ?? null,
    lang: isPortalLang(body.lang) ? body.lang : null,
    type: body.type,
    ctx: body.ctx && typeof body.ctx === 'object' ? body.ctx : {},
  })
  return NextResponse.json({ ok: true })
}
