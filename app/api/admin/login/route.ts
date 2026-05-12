import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, findAdmin, listAdminAccounts } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (listAdminAccounts().length === 0) {
    return NextResponse.json({ ok: false, error: 'admin_password_not_set' }, { status: 500 })
  }
  let body: { username?: string; password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const account = findAdmin(body.username ?? '', body.password ?? '')
  if (!account) {
    return NextResponse.json({ ok: false, error: 'wrong_credentials' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, account.password, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
