import { NextResponse } from 'next/server'
import { addItem, cleanSnapshot, getOwned, proOwner, removeItem, setNote, type CollectionKind } from '@/lib/collections'

// Объекты в подборке: добавить (POST), заметка клиенту (PATCH), убрать (DELETE).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }
type Body = { kind?: unknown; slug?: unknown; snapshot?: unknown; note?: unknown }

async function parse(req: Request, params: Params['params']) {
  const owner = await proOwner()
  if (owner == null) return { error: NextResponse.json({ error: 'pro_required' }, { status: 403 }) }
  const c = await getOwned(owner, (await params).id)
  if (!c) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  const body = await req.json().catch(() => null) as Body | null
  const kind = body?.kind === 'villa' || body?.kind === 'apartment' ? (body.kind as CollectionKind) : null
  const slug = typeof body?.slug === 'string' && /^[a-z0-9-]{1,160}$/.test(body.slug) ? body.slug : null
  if (!kind || !slug) return { error: NextResponse.json({ error: 'bad_item' }, { status: 400 }) }
  return { c, kind, slug, body: body as Body }
}

function fail(where: string, e: unknown) {
  console.error(`[collections] ${where}`, e instanceof Error ? e.message : e)
  return NextResponse.json({ error: 'failed' }, { status: 500 })
}

export async function POST(req: Request, { params }: Params) {
  const r = await parse(req, params)
  if (r.error) return r.error
  const snap = cleanSnapshot(r.body.snapshot)
  if (!snap) return NextResponse.json({ error: 'bad_snapshot' }, { status: 400 })
  try { await addItem(r.c.id, r.kind, r.slug, snap); return NextResponse.json({ ok: true }) } catch (e) { return fail('add', e) }
}

export async function PATCH(req: Request, { params }: Params) {
  const r = await parse(req, params)
  if (r.error) return r.error
  const note = typeof r.body.note === 'string' ? r.body.note.trim().slice(0, 500) || null : null
  try { await setNote(r.c.id, r.kind, r.slug, note); return NextResponse.json({ ok: true }) } catch (e) { return fail('note', e) }
}

export async function DELETE(req: Request, { params }: Params) {
  const r = await parse(req, params)
  if (r.error) return r.error
  try { await removeItem(r.c.id, r.kind, r.slug); return NextResponse.json({ ok: true }) } catch (e) { return fail('remove', e) }
}
