import { NextResponse } from 'next/server'
import { adminSb } from '@/lib/admin/sb'
import { DEV_COOKIE, DEV_COOKIE_MAX_AGE, DEV_KEY_FIELD, parseDevToken } from '@/lib/page-edit/dev-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const str = (v: unknown): string => (Array.isArray(v) ? str(v[0]) : v == null ? '' : String(v).trim())

// GET ?t=<токен из личной ссылки> — ставит куку застройщика и ведёт на его
// страницу, где появляется кнопка «Редактировать».
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('t')
  const parsed = parseDevToken(token)
  const fail = () => NextResponse.redirect(new URL('/ru/zastrojshhiki?edit=expired', url.origin))
  if (!parsed) return fail()
  const { data } = await adminSb().from('raw_developers').select('data').eq('airtable_id', parsed.devId).maybeSingle()
  const d = (data as { data?: Record<string, unknown> } | null)?.data
  if (!d || str(d[DEV_KEY_FIELD]) !== parsed.key) return fail()
  const slug = str(d['SEO:Slug'])
  const res = NextResponse.redirect(new URL(slug ? `/ru/zastrojshhiki/${encodeURIComponent(slug)}` : '/ru/zastrojshhiki', url.origin))
  res.cookies.set(DEV_COOKIE, token!, {
    httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: DEV_COOKIE_MAX_AGE,
  })
  return res
}
