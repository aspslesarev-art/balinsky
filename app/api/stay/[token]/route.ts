import { NextResponse } from 'next/server'
import {
  listMessages, listStayRequests, loadCatalog, findOpenStay, markRead, resolveRoomByToken,
} from '@/lib/hotel/db'
import { PORTAL_LANGS, isPortalLang, type PortalLang } from '@/lib/hotel/i18n'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/stay/:token — всё состояние портала одним запросом.
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
  const [catalog, messages, requests] = await Promise.all([
    loadCatalog(hotel.id),
    stay ? listMessages(stay.id) : Promise.resolve([]),
    stay ? listStayRequests(stay.id) : Promise.resolve([]),
  ])
  // Гость смотрит на экран — значит, ответы стойки прочитаны.
  if (stay) await markRead(stay.id, 'guest')

  // Языки отеля могут отставать от портальных (в базе список правится руками) —
  // отдаём пересечение, иначе гость выберет язык, которого нет в словаре.
  const langs = (hotel.langs ?? []).filter(isPortalLang) as PortalLang[]

  return NextResponse.json({
    hotel: {
      name: hotel.name,
      lang: isPortalLang(hotel.lang) ? hotel.lang : 'en',
      langs: langs.length > 0 ? langs : [...PORTAL_LANGS],
      whatsapp: hotel.whatsapp,
      telegram: hotel.telegram_username,
      hasRestaurant: hotel.has_restaurant,
    },
    room: { label: room.label },
    stay: stay ? { id: stay.id, guest_name: stay.guest_name } : null,
    catalog,
    messages,
    requests,
  })
}
