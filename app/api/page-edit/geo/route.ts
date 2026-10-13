import { NextResponse } from 'next/server'
import { currentEditor } from '@/lib/page-edit/access'
import { isShortMapsLink, parseCoords } from '@/lib/page-edit/geo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET ?url=<короткая ссылка Google Maps> → { lat, lng }.
// Короткие maps.app.goo.gl не содержат координат — раскрываем редирект здесь.
// Ходим только на хосты Google и только по редиректам, тело не читаем.
const ALLOWED = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+|consent\.google\.com)\//i

export async function GET(req: Request) {
  if (!(await currentEditor())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const raw = new URL(req.url).searchParams.get('url') ?? ''
  const direct = parseCoords(raw)
  if (direct) return NextResponse.json(direct)
  if (!isShortMapsLink(raw)) return NextResponse.json({ error: 'not_a_maps_link' }, { status: 400 })

  let url = raw.trim().replace(/^http:/i, 'https:')
  for (let hop = 0; hop < 5; hop++) {
    if (!ALLOWED.test(url)) break
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) }).catch(() => null)
    const next = res?.headers.get('location')
    if (!next) break
    url = new URL(next, url).toString()
    const p = parseCoords(url)
    if (p) return NextResponse.json(p)
    // consent.google.com прячет настоящий адрес в параметре continue.
    const cont = new URL(url).searchParams.get('continue')
    if (cont) { const q = parseCoords(cont); if (q) return NextResponse.json(q) }
  }
  return NextResponse.json({ error: 'no_coords' }, { status: 422 })
}
