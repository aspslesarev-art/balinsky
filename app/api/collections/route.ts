import { NextResponse } from 'next/server'
import { addItem, cleanSnapshot, createCollection, listCollections, membership, proOwner, type CollectionKind } from '@/lib/collections'

// Подборки агента (Pro): список, меню «В подборку» на объекте, создание.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KINDS = new Set(['villa', 'apartment'])
const SLUG = /^[a-z0-9-]{1,160}$/
const NO_STORE = { 'cache-control': 'no-store' }

export async function GET(req: Request) {
  const owner = await proOwner()
  if (owner == null) return NextResponse.json({ error: 'pro_required' }, { status: 403 })
  const u = new URL(req.url)
  const kind = u.searchParams.get('kind') ?? ''
  const slug = u.searchParams.get('slug') ?? ''
  try {
    if (KINDS.has(kind) && SLUG.test(slug)) {
      return NextResponse.json({ lists: await membership(owner, kind as CollectionKind, slug) }, { headers: NO_STORE })
    }
    return NextResponse.json({ lists: await listCollections(owner) }, { headers: NO_STORE })
  } catch (e) {
    console.error('[collections]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

/** { title, item?: { kind, slug, snapshot } } — новая подборка, сразу с объектом. */
export async function POST(req: Request) {
  const owner = await proOwner()
  if (owner == null) return NextResponse.json({ error: 'pro_required' }, { status: 403 })
  const body = await req.json().catch(() => null) as { title?: unknown; item?: { kind?: unknown; slug?: unknown; snapshot?: unknown } } | null
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : ''
  if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 })
  try {
    const c = await createCollection(owner, title)
    const it = body?.item
    if (it && typeof it.kind === 'string' && KINDS.has(it.kind) && typeof it.slug === 'string' && SLUG.test(it.slug)) {
      const snap = cleanSnapshot(it.snapshot)
      if (snap) await addItem(c.id, it.kind as CollectionKind, it.slug, snap)
    }
    return NextResponse.json({ collection: c })
  } catch (e) {
    console.error('[collections] create', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
