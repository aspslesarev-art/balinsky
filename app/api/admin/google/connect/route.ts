import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { OAUTH_STATE_COOKIE, googleAuthUrl } from '@/lib/meetings/google'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.redirect(new URL('/admin', req.url))
  const origin = new URL(req.url).origin
  const state = randomBytes(24).toString('hex')
  let url: string
  try {
    url = googleAuthUrl(`${origin}/api/admin/google/callback`, state)
  } catch (e) {
    console.error('[admin/google/connect]', e)
    return NextResponse.redirect(new URL('/admin/vstrechi?google=no_client', req.url))
  }
  const res = NextResponse.redirect(url)
  res.cookies.set(OAUTH_STATE_COOKIE, state, { httpOnly: true, secure: origin.startsWith('https'), sameSite: 'lax', path: '/api/admin/google', maxAge: 600 })
  return res
}
