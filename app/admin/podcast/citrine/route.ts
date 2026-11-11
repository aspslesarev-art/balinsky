// Сценарий подкаста с застройщиком CITRINE - чтобы открыть с планшета в студии.
// Закрыто входом админа; без входа - на /admin (там форма входа).
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { PODCAST_CITRINE_HTML } from './html'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Относительный Location: за прокси req.url несёт внутренний порт.
  if (!(await requireAdmin())) return new NextResponse(null, { status: 307, headers: { location: '/admin' } })
  return new NextResponse(PODCAST_CITRINE_HTML, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
