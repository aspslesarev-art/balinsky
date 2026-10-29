import { NextResponse } from 'next/server'
import { geoFromHeaders, getByToken, isFreshVisit, listItems, notifyAgent, parseUa, pingVisit, startVisit } from '@/lib/collections'

// История открытий подборки клиентом: POST — новый заход (устройство и
// страна по IP), PATCH — «ещё здесь» и какой объект открыл.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ token: string }> }
const VISITOR = /^[A-Za-z0-9_-]{8,64}$/

export async function POST(req: Request, { params }: Params) {
  const found = await getByToken((await params).token).catch(() => null)
  if (!found || !found.collection.active) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const body = await req.json().catch(() => null) as { visitor?: unknown } | null
  const visitor = typeof body?.visitor === 'string' && VISITOR.test(body.visitor) ? body.visitor : null
  if (!visitor) return NextResponse.json({ error: 'bad_visitor' }, { status: 400 })
  const ua = parseUa(req.headers.get('user-agent') ?? '')
  const geo = geoFromHeaders(req.headers)
  try {
    const fresh = await isFreshVisit(found.collection.id, visitor)
    const id = await startVisit(found.collection.id, visitor, { ...ua, ...geo })
    if (fresh && !ua.preview) {
      const where = [geo.country, geo.city].filter(Boolean).join(', ')
      await notifyAgent(found.owner, `Клиент открыл подборку «${found.collection.title}»\n${ua.device}, ${ua.browser}${where ? ` · ${where}` : ''}`)
    }
    return NextResponse.json({ id })
  } catch (e) {
    console.error('[p/visit]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const found = await getByToken((await params).token).catch(() => null)
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const body = await req.json().catch(() => null) as { id?: unknown; viewed?: unknown } | null
  const id = typeof body?.id === 'number' && Number.isInteger(body.id) ? body.id : null
  if (id == null) return NextResponse.json({ error: 'bad_id' }, { status: 400 })
  // Клиент знает только номер объекта в подборке — ключ объекта находим здесь.
  let viewed: string | null = null
  if (typeof body?.viewed === 'number' && Number.isInteger(body.viewed) && body.viewed >= 1 && body.viewed <= 200) {
    const it = (await listItems(found.collection.id).catch(() => []))[body.viewed - 1]
    viewed = it ? `${it.kind}:${it.slug}` : null
  }
  await pingVisit(found.collection.id, id, viewed).catch(e => console.error('[p/visit] ping', e instanceof Error ? e.message : e))
  return NextResponse.json({ ok: true })
}
