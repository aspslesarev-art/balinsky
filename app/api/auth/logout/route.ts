import { NextResponse } from 'next/server'
import { clearedCookies } from '@/lib/site-auth'

// «Sign out» на /pro. Обычная форма POST — работает и без JS.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL('/pro', req.url), { status: 303 })
  for (const c of clearedCookies()) res.cookies.set(c)
  return res
}
