import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { OAUTH_STATE_COOKIE, exchangeCodeAndStore } from '@/lib/meetings/google'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.redirect(new URL('/admin', req.url))
  const url = new URL(req.url)
  const back = (status: string) => {
    const res = NextResponse.redirect(new URL(`/admin/vstrechi?google=${status}`, req.url))
    res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: '/api/admin/google' })
    return res
  }

  const state = url.searchParams.get('state')
  const expected = req.headers.get('cookie')?.match(new RegExp(`${OAUTH_STATE_COOKIE}=([a-f0-9]+)`))?.[1]
  if (!state || !expected || state !== expected) return back('bad_state')
  if (url.searchParams.get('error')) return back('denied')
  const code = url.searchParams.get('code')
  if (!code) return back('no_code')

  try {
    await exchangeCodeAndStore(code, `${url.origin}/api/admin/google/callback`)
    return back('connected')
  } catch (e) {
    console.error('[admin/google/callback]', e)
    return back('failed')
  }
}
