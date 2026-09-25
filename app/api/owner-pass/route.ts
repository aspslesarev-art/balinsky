// Owner pass for the Vercel firewall.
//
// The owner's IP is dynamic (Starlink) and sometimes shared with other
// clients, so an IP allow-list keeps breaking — and a flood ban on a shared
// IP locked the owner out entirely (2026-09-25). Instead: open
// /api/owner-pass?key=<OWNER_BYPASS_KEY> once per browser; it sets a
// long-lived cookie, and the firewall's «Owner and service bypass» rule lets
// any request carrying that cookie through, whatever the IP.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const expected = process.env.OWNER_BYPASS_KEY
  const key = new URL(request.url).searchParams.get('key')
  if (!expected || !key || key !== expected) {
    return new NextResponse('Not found', { status: 404 })
  }
  const res = NextResponse.redirect(new URL('/', request.url))
  res.cookies.set('bz_pass', expected, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  })
  return res
}
