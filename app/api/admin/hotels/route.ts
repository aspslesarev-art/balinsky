import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createHotel, listHotels, updateHotel } from '@/lib/hotel/db'
import { newStaffCode } from '@/lib/hotel/token'
import { isPortalLang, PORTAL_LANGS, type PortalLang } from '@/lib/hotel/i18n'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ hotels: await listHotels() })
}

// POST /api/admin/hotels — завести отель. Код смены генерируем сами:
// придуманные руками коды в отелях живут годами и совпадают с номером дома.
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { slug?: string; name?: string; address?: string; lang?: PortalLang }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const slug = (body.slug ?? '').trim().toLowerCase()
  const name = (body.name ?? '').trim()
  if (!SLUG_RE.test(slug) || !name) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const staffCode = newStaffCode()
  try {
    const hotel = await createHotel({
      slug, name, address: (body.address ?? '').trim() || null,
      lang: isPortalLang(body.lang) ? body.lang : 'en',
      staffCode,
    })
    return NextResponse.json({ ok: true, hotel, staffCode })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    const taken = /duplicate key|23505/.test(message)
    return NextResponse.json({ error: taken ? 'slug_taken' : 'failed' }, { status: taken ? 409 : 500 })
  }
}

// PATCH /api/admin/hotels — правка отеля; `newStaffCode` перевыпускает код
// смены (и разлогинивает всех, кому старый успели переслать).
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: {
    id?: number; name?: string; address?: string; lang?: PortalLang; langs?: string[]
    whatsapp?: string; telegram_username?: string; telegram_chat_id?: string
    has_restaurant?: boolean; active?: boolean; newStaffCode?: boolean
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body.id) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const patch: Parameters<typeof updateHotel>[1] = {}
  if (body.name !== undefined) patch.name = body.name.trim()
  if (body.address !== undefined) patch.address = body.address.trim() || null
  if (body.lang !== undefined) patch.lang = isPortalLang(body.lang) ? body.lang : 'en'
  if (body.langs !== undefined) {
    // Пустой список языков сделал бы портал непереключаемым — держим все.
    const langs = body.langs.filter(isPortalLang) as PortalLang[]
    patch.langs = langs.length > 0 ? langs : [...PORTAL_LANGS]
  }
  if (body.whatsapp !== undefined) patch.whatsapp = body.whatsapp.trim() || null
  if (body.telegram_username !== undefined) patch.telegram_username = body.telegram_username.replace('@', '').trim() || null
  if (body.telegram_chat_id !== undefined) patch.telegram_chat_id = body.telegram_chat_id.trim() || null
  if (body.has_restaurant !== undefined) patch.has_restaurant = body.has_restaurant
  if (body.active !== undefined) patch.active = body.active
  const staffCode = body.newStaffCode ? newStaffCode() : null
  if (staffCode) patch.staff_code = staffCode

  await updateHotel(body.id, patch)
  return NextResponse.json({ ok: true, staffCode })
}
