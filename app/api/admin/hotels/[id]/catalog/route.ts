import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  deleteItem, loadCatalog, setCategoryActive, setItemActive, upsertCategory, upsertItem,
  type CatalogSection, type I18nField, type Item,
} from '@/lib/hotel/db'
import { PORTAL_LANGS } from '@/lib/hotel/i18n'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CODE_RE = /^[a-z0-9_-]{2,40}$/
const SECTIONS: CatalogSection[] = ['hotel', 'bali', 'room', 'every']
const UNITS = new Set(['once', 'day', 'hour', 'kg'])

/** Из формы приходит объект по языкам — берём только известные и непустые. */
function i18n(raw: unknown): I18nField | null {
  if (!raw || typeof raw !== 'object') return null
  const out: I18nField = {}
  for (const lang of PORTAL_LANGS) {
    const v = (raw as Record<string, unknown>)[lang]
    if (typeof v === 'string' && v.trim()) out[lang] = v.trim()
  }
  return Object.keys(out).length > 0 ? out : null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  return NextResponse.json({ catalog: await loadCatalog(Number(id), false) })
}

// POST — завести или переписать категорию либо позицию (ключ — code).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const hotelId = Number(id)

  let body: {
    kind?: 'category' | 'item'
    code?: string; section?: CatalogSection; icon?: string; photo_url?: string
    categoryId?: number; price_usd?: number; unit?: string; sort?: number
    title?: unknown; caption?: unknown; descr?: unknown
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const code = (body.code ?? '').trim().toLowerCase()
  const title = i18n(body.title)
  if (!CODE_RE.test(code) || !title) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  if (body.kind === 'category') {
    if (!body.section || !SECTIONS.includes(body.section)) {
      return NextResponse.json({ error: 'bad_section' }, { status: 400 })
    }
    await upsertCategory(hotelId, {
      code, section: body.section, title, caption: i18n(body.caption),
      icon: (body.icon ?? '').trim() || null,
      photo_url: (body.photo_url ?? '').trim() || null,
      sort: Number.isFinite(body.sort) ? Number(body.sort) : 100,
    })
    return NextResponse.json({ ok: true })
  }

  if (!body.categoryId) return NextResponse.json({ error: 'no_category' }, { status: 400 })
  await upsertItem(hotelId, Number(body.categoryId), {
    code, title, descr: i18n(body.descr),
    price_usd: Number.isFinite(body.price_usd) ? Number(body.price_usd) : null,
    unit: (body.unit && UNITS.has(body.unit) ? body.unit : 'once') as Item['unit'],
    photo_url: (body.photo_url ?? '').trim() || null,
    sort: Number.isFinite(body.sort) ? Number(body.sort) : 100,
  })
  return NextResponse.json({ ok: true })
}

// PATCH — показать/скрыть; DELETE — убрать позицию совсем.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params

  let body: { kind?: 'category' | 'item'; targetId?: number; active?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body.targetId || body.active === undefined) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  if (body.kind === 'category') await setCategoryActive(Number(id), body.targetId, body.active)
  else await setItemActive(Number(id), body.targetId, body.active)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params

  let body: { itemId?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body.itemId) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  await deleteItem(Number(id), body.itemId)
  return NextResponse.json({ ok: true })
}
