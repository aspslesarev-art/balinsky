import { NextResponse } from 'next/server'
import {
  addMessage, addRequest, countOpenRequests, ensureOpenStay, hotelTelegramChat, itemById,
  logEvent, resolveRoomByToken,
} from '@/lib/hotel/db'
import { notifyReception, unitTag } from '@/lib/hotel/notify'
import { pick, priceLabel, isPortalLang } from '@/lib/hotel/i18n'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_NOTE = 500
const MAX_TIME = 120
// Больше десятка незакрытых заявок из одного номера — это не гость,
// а залипшая кнопка или шутник: дальше принимать нечего.
const MAX_OPEN_REQUESTS = 12

// POST /api/stay/:token/request — заявка из каталога (ТЗ 14.2):
// что нужно, удобное время, WhatsApp. WhatsApp обязателен — по нему отель
// подтверждает заказ, и он же делает реферал доказуемым.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await resolveRoomByToken(token)
  if (!found) return NextResponse.json({ error: 'unknown_room' }, { status: 404 })

  let body: { itemId?: number; note?: string; time?: string; whatsapp?: string; lang?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const whatsapp = (body.whatsapp ?? '').trim()
  if (whatsapp.replace(/\D/g, '').length < 6) {
    return NextResponse.json({ error: 'bad_whatsapp' }, { status: 400 })
  }

  // Что именно заказали, решает каталог, а не тело запроса: иначе стойке
  // приедет заявка на услугу, которой у отеля нет.
  const item = body.itemId ? await itemById(found.hotel.id, Number(body.itemId)) : null
  if (!item || !item.active) return NextResponse.json({ error: 'unknown_item' }, { status: 400 })

  const lang = isPortalLang(body.lang) ? body.lang : found.hotel.lang
  const note = (body.note ?? '').trim().slice(0, MAX_NOTE) || null
  const preferredTime = (body.time ?? '').trim().slice(0, MAX_TIME) || null

  const stay = await ensureOpenStay(found.room)
  if (await countOpenRequests(stay.id) >= MAX_OPEN_REQUESTS) {
    return NextResponse.json({ error: 'too_many_open' }, { status: 429 })
  }

  // В заявке название на языке отеля — его читает персонал; гостю портал
  // покажет ту же позицию на его языке по item_id.
  const title = pick(item.title, found.hotel.lang) || pick(item.title, 'en')
  const request = await addRequest({
    stay, title, note, itemId: item.id, whatsapp, preferredTime,
    priceUsd: item.price_usd, lang,
  })

  // Заявка дублируется строкой в чат: у гостя и стойки одна общая лента,
  // а не два места, куда надо смотреть.
  await addMessage({ stay, author: 'guest', body: note ? `${title} — ${note}` : title, lang })

  await logEvent({
    hotelId: found.hotel.id, roomId: found.room.id, stayId: stay.id, lang,
    type: 'order_submit', ctx: { item: item.code, price: item.price_usd ?? 0 },
  })

  const tag = unitTag(found.room.label, lang)
  await notifyReception(await hotelTelegramChat(found.hotel.id), [
    `${tag} ${title} — ${priceLabel(item.price_usd, item.unit, found.hotel.lang)}`,
    note ? `Что: ${note}` : null,
    preferredTime ? `Когда: ${preferredTime}` : null,
    `WhatsApp: ${whatsapp}`,
  ].filter(Boolean).join('\n'))

  return NextResponse.json({ ok: true, request })
}
