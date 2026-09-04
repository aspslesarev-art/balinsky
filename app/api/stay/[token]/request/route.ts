import { NextResponse } from 'next/server'
import {
  addMessage, addRequest, countOpenRequests, ensureOpenStay, listServices, resolveRoomByToken,
} from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TITLE = 120
const MAX_NOTE = 500
// Больше десятка незакрытых заказов из одного номера — это не гость,
// а залипшая кнопка или шутник: дальше принимать нечего.
const MAX_OPEN_REQUESTS = 12

// POST /api/stay/:token/request — заказ услуги: либо кнопка из меню отеля
// (service_code), либо просьба словами.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await resolveRoomByToken(token)
  if (!found) return NextResponse.json({ error: 'unknown_room' }, { status: 404 })

  let body: { serviceCode?: string; title?: string; note?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  let title = (body.title ?? '').trim().slice(0, MAX_TITLE)
  const note = (body.note ?? '').trim().slice(0, MAX_NOTE) || null
  let serviceCode: string | null = null

  if (body.serviceCode) {
    // Название берём из меню отеля, а не из тела запроса: иначе в заказ
    // приедет что угодно, а стойка будет думать, что это её услуга.
    const service = (await listServices(found.hotel.id)).find(s => s.code === body.serviceCode)
    if (!service) return NextResponse.json({ error: 'unknown_service' }, { status: 400 })
    serviceCode = service.code
    title = service.title
  }
  if (!title) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const stay = await ensureOpenStay(found.room)
  if (await countOpenRequests(stay.id) >= MAX_OPEN_REQUESTS) {
    return NextResponse.json({ error: 'too_many_open' }, { status: 429 })
  }

  const request = await addRequest({ stay, title, note, serviceCode })
  // Заказ дублируем строкой в чат: у гостя и стойки остаётся одна общая
  // лента событий, а не два места, куда надо смотреть.
  await addMessage({
    stay,
    author: 'guest',
    body: note ? `${title} — ${note}` : title,
  })
  return NextResponse.json({ ok: true, request })
}
