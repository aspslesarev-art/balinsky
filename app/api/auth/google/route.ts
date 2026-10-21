import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { GOOGLE_NEXT_COOKIE, GOOGLE_STATE_COOKIE, googleSignInUrl } from '@/lib/google-signin'
import { safeNextPath } from '@/lib/site-auth'

// Кнопка «Continue with Google» на /pro: уводит на Google с одноразовым
// state в httpOnly-куке, вернуться — на /api/auth/google/callback.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const state = randomBytes(24).toString('base64url')
  const target = googleSignInUrl(`${url.origin}/api/auth/google/callback`, state)
  if (!target) return NextResponse.redirect(new URL('/pro?error=google', url))
  const secure = url.protocol === 'https:'
  const res = NextResponse.redirect(target)
  const cookie = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/api/auth/google', maxAge: 600 }
  res.cookies.set(GOOGLE_STATE_COOKIE, state, cookie)
  res.cookies.set(GOOGLE_NEXT_COOKIE, safeNextPath(url.searchParams.get('next')) ?? '/pro', cookie)
  return res
}
