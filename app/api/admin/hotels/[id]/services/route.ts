import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listServices, setServiceActive, upsertService } from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CODE_RE = /^[a-z0-9_-]{2,40}$/

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  return NextResponse.json({ services: await listServices(Number(id), false) })
}

// POST — добавить или переписать услугу в меню номера (ключ — code).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params

  let body: { code?: string; title?: string; title_en?: string; note?: string; price_usd?: number; sort?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const code = (body.code ?? '').trim().toLowerCase()
  const title = (body.title ?? '').trim()
  if (!CODE_RE.test(code) || !title) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  await upsertService(Number(id), {
    code,
    title,
    title_en: (body.title_en ?? '').trim() || null,
    note: (body.note ?? '').trim() || null,
    price_usd: Number.isFinite(body.price_usd) ? Number(body.price_usd) : null,
    sort: Number.isFinite(body.sort) ? Number(body.sort) : 100,
  })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params

  let body: { serviceId?: number; active?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body.serviceId || body.active === undefined) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  await setServiceActive(Number(id), body.serviceId, body.active)
  return NextResponse.json({ ok: true })
}
