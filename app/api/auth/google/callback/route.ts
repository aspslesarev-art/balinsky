import { loginCookies } from '@/lib/pro-access'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { GOOGLE_NEXT_COOKIE, GOOGLE_STATE_COOKIE, exchangeGoogleCode } from '@/lib/google-signin'
import { safeNextPath, signInVerifiedEmail } from '@/lib/site-auth'

// Возврат с Google: сверяем state, меняем code на почту, ставим сессию сайта.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const jar = await cookies()
  const state = jar.get(GOOGLE_STATE_COOKIE)?.value
  const next = safeNextPath(jar.get(GOOGLE_NEXT_COOKIE)?.value) ?? '/pro'
  const fail = () => NextResponse.redirect(new URL('/pro?error=google', url))

  const code = url.searchParams.get('code')
  // Отказ на экране Google — просто назад, без ошибки.
  if (url.searchParams.get('error')) return NextResponse.redirect(new URL('/pro', url))
  if (!code || !state || url.searchParams.get('state') !== state) return fail()

  const profile = await exchangeGoogleCode(code, `${url.origin}/api/auth/google/callback`)
  if (!profile) return fail()
  const id = await signInVerifiedEmail(profile.email, profile.givenName, profile.familyName)
  if (id == null) return fail()

  const res = NextResponse.redirect(new URL(next, url))
  for (const c of await loginCookies(id)) res.cookies.set(c)
  const gone = { path: '/api/auth/google', maxAge: 0 }
  res.cookies.set({ name: GOOGLE_STATE_COOKIE, value: '', ...gone })
  res.cookies.set({ name: GOOGLE_NEXT_COOKIE, value: '', ...gone })
  return res
}
