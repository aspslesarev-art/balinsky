import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { upsertParser, deleteParser } from '@/lib/complex-parsers'
import { getParserModule } from '@/lib/parsers/_registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = Promise<{ complexId: string }>

// Upsert parser config for the complex. parser_type derives from the
// registry — для ЖК без реализованного парсера сохранение запрещено.
export async function PUT(req: Request, { params }: { params: Params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { complexId } = await params
  if (!complexId) return NextResponse.json({ error: 'complex_id_required' }, { status: 400 })
  if (!getParserModule(complexId)) {
    return NextResponse.json({ error: 'parser_not_implemented', detail: 'Для этого ЖК парсер ещё не написан — добавь файл в lib/parsers/ и зарегистрируй в _registry.ts' }, { status: 400 })
  }
  let body: Partial<{ source_url: string; interval_minutes: number | null; notes: string }>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (!body.source_url || typeof body.source_url !== 'string') return NextResponse.json({ error: 'source_url_required' }, { status: 400 })
  let interval: number | null = null
  if (body.interval_minutes != null) {
    const n = Number(body.interval_minutes)
    if (!Number.isFinite(n) || n < 5) return NextResponse.json({ error: 'interval_too_small', detail: 'минимум 5 минут или null для ручного режима' }, { status: 400 })
    if (n > 60 * 24 * 30) return NextResponse.json({ error: 'interval_too_large' }, { status: 400 })
    interval = Math.round(n)
  }
  try {
    const parser = await upsertParser({
      complex_id: complexId,
      source_url: body.source_url.trim(),
      interval_minutes: interval,
      notes: body.notes ?? null,
    })
    return NextResponse.json({ parser })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'upsert_failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { complexId } = await params
  try { await deleteParser(complexId); return NextResponse.json({ ok: true }) }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'delete_failed' }, { status: 500 }) }
}
