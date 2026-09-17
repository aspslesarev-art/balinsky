import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sbAdmin } from '@/lib/market/apply'
import { BUCKET, OBJECT } from '@/lib/finish-explorer/build'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// HTML эксплорера отделки. Сам срез (~9 МБ) сюда не вшивается — у функций
// Vercel потолок ответа 4.5 МБ; браузер забирает его из закрытого Storage
// по подписанной ссылке на час.
export async function GET() {
  if (!(await requireAdmin())) return new NextResponse('Нужен вход в админку', { status: 401 })

  const { data, error } = await sbAdmin().storage.from(BUCKET).createSignedUrl(OBJECT, 3600)
  if (error || !data) return new NextResponse('Срез ещё не собран', { status: 503 })

  const tpl = await readFile(path.join(process.cwd(), 'lib/finish-explorer/template.html'), 'utf8')
  const html = tpl.replace('__DATA_URL__', () => JSON.stringify(data.signedUrl).replace(/</g, '\\u003c'))
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
