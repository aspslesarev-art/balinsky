import { NextResponse } from 'next/server'
import { DESK_COOKIE } from '@/lib/hotel/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(DESK_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 })
  return res
}
