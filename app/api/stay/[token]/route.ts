import { NextResponse } from 'next/server'
import {
  listMessages, listServices, listStayRequests, findOpenStay, markRead, resolveRoomByToken,
} from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/stay/:token — всё состояние страницы гостя одним запросом.
//
// Ключ доступа — сам токен из QR: кто в номере, тот и в переписке. Это
// осознанный размен ради «отсканировал и пишешь» без регистрации, поэтому
// токен длинный и меняется в админке одной кнопкой, если наклейку сфоткали.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await resolveRoomByToken(token)
  if (!found) return NextResponse.json({ error: 'unknown_room' }, { status: 404 })

  const { hotel, room } = found
  const stay = await findOpenStay(room.id)
  const [services, messages, requests] = await Promise.all([
    listServices(hotel.id),
    stay ? listMessages(stay.id) : Promise.resolve([]),
    stay ? listStayRequests(stay.id) : Promise.resolve([]),
  ])
  // Гость смотрит на экран — значит, ответы стойки прочитаны.
  if (stay) await markRead(stay.id, 'guest')

  return NextResponse.json({
    hotel: { name: hotel.name, lang: hotel.lang },
    room: { label: room.label },
    stay: stay ? { id: stay.id, guest_name: stay.guest_name } : null,
    services,
    messages,
    requests,
  })
}
