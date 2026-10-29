import { NextResponse } from 'next/server'
import { deleteCollection, getOwned, proOwner, reorder, updateCollection } from '@/lib/collections'

// Одна подборка агента: название, слова клиенту, вкл/выкл ссылки, порядок, удаление.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

async function owned(params: Params['params']) {
  const owner = await proOwner()
  if (owner == null) return { error: NextResponse.json({ error: 'pro_required' }, { status: 403 }) }
  const c = await getOwned(owner, (await params).id)
  if (!c) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  return { c }
}

export async function PATCH(req: Request, { params }: Params) {
  const r = await owned(params)
  if (r.error) return r.error
  const body = await req.json().catch(() => null) as { title?: unknown; intro?: unknown; active?: unknown; order?: unknown } | null
  if (!body) return NextResponse.json({ error: 'bad_body' }, { status: 400 })
  try {
    const patch: { title?: string; intro?: string | null; active?: boolean } = {}
    if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 120)
    if (typeof body.intro === 'string') patch.intro = body.intro.trim().slice(0, 1000) || null
    if (typeof body.active === 'boolean') patch.active = body.active
    if (Object.keys(patch).length) await updateCollection(r.c.id, patch)
    if (Array.isArray(body.order)) {
      const keys = body.order.filter((k): k is string => typeof k === 'string' && /^(villa|apartment):[a-z0-9-]{1,160}$/.test(k)).slice(0, 200)
      await reorder(r.c.id, keys)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[collections] patch', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const r = await owned(params)
  if (r.error) return r.error
  try {
    await deleteCollection(r.c.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[collections] delete', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
