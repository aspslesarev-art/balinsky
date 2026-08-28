import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCollection } from '@/lib/admin/collections'
import { adapterFor } from '@/lib/admin/adapters'
import { revalidateCollection } from '@/lib/admin/revalidate'
import { aiAutofillPatch } from '@/lib/admin/ai-autofill'
import { areaSyncPatch } from '@/lib/admin/area-sync'
import { withComplexDescription } from '@/lib/admin/complex-description'
import { mapLinkGeoPatch } from '@/lib/admin/map-link-geo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ collection: string; id: string }> }

// GET /api/admin/data/[collection]/[id] — full record for the side panel.
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection, id } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  try {
    const row = await adapterFor(cfg).get(cfg, id)
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    // Открываем «Описание комплекса» с текстом, который сейчас на сайте, —
    // редактировать надо именно его. Только для чтения: PATCH шлёт лишь
    // изменённые поля, так что нетронутый текст никуда не записывается.
    return NextResponse.json({ row: await withComplexDescription(cfg, row) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'get_failed' }, { status: 500 })
  }
}

// PATCH /api/admin/data/[collection]/[id] — partial update. Body: { fields }.
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection, id } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  if (!cfg.caps.update) return NextResponse.json({ error: 'update_not_allowed' }, { status: 403 })

  let body: { fields?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const patch = body.fields ?? {}
  try {
    // An edit is usually what completes a record — the body gets pasted in on
    // the second save. Merge the patch over the stored row so the generators
    // see the finished material, then fill whatever is still empty.
    const adapter = adapterFor(cfg)
    const current = await adapter.get(cfg, id)
    // Changing `Площадь` has to carry the metreage quoted in the record's own
    // copy with it, or the title keeps advertising the old area.
    const areaPatch = areaSyncPatch(cfg, current?.fields ?? {}, patch)
    const merged = { ...(current?.fields ?? {}), ...patch, ...areaPatch }
    // Ссылку на локацию редактор вставляет уже в карточке — координаты для
    // карты достаём из неё тут же (lib/admin/map-link-geo.ts).
    const geoPatch = await mapLinkGeoPatch(cfg, merged)
    await adapter.update(cfg, id, {
      ...patch, ...areaPatch, ...geoPatch,
      ...(await aiAutofillPatch(cfg, { ...merged, ...geoPatch })),
    })
    await revalidateCollection(cfg, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'update_failed' }, { status: 500 })
  }
}

// DELETE /api/admin/data/[collection]/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { collection, id } = await params
  const cfg = getCollection(collection)
  if (!cfg) return NextResponse.json({ error: 'unknown_collection' }, { status: 404 })
  if (!cfg.caps.delete) return NextResponse.json({ error: 'delete_not_allowed' }, { status: 403 })
  try {
    await adapterFor(cfg).remove(cfg, id)
    await revalidateCollection(cfg, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'delete_failed' }, { status: 500 })
  }
}
