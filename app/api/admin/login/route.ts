import { NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const expectedPassword = process.env.ADMIN_PASSWORD
  const expectedUsername = (process.env.ADMIN_USERNAME ?? 'andrei').toLowerCase()
  if (!expectedPassword) return NextResponse.json({ ok: false, error: 'admin_password_not_set' }, { status: 500 })
  let body: { username?: string; password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const usernameOk = (body.username ?? '').trim().toLowerCase() === expectedUsername
  const passwordOk = body.password === expectedPassword
  if (!usernameOk || !passwordOk) {
    return NextResponse.json({ ok: false, error: 'wrong_credentials' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, expectedPassword, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
