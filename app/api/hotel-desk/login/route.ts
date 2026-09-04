import { NextResponse } from 'next/server'
import { checkStaffCode, deskCookieValue, DESK_COOKIE } from '@/lib/hotel/auth'
import { hotelBySlug, hotelStaffCode } from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/hotel-desk/login — вход стойки: slug отеля + код смены.
export async function POST(req: Request) {
  let body: { slug?: string; code?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  const slug = (body.slug ?? '').trim().toLowerCase()
  const hotel = slug ? await hotelBySlug(slug) : null
  if (!hotel || !hotel.active) return NextResponse.json({ ok: false, error: 'unknown_hotel' }, { status: 401 })

  const actual = await hotelStaffCode(hotel.id)
  if (!checkStaffCode(body.code ?? '', actual)) {
    return NextResponse.json({ ok: false, error: 'wrong_code' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, slug: hotel.slug })
  res.cookies.set(DESK_COOKIE, deskCookieValue(hotel.id, actual!), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
