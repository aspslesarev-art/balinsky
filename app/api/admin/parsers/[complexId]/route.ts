import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { upsertParser, deleteParser, type ParserType } from '@/lib/complex-parsers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PARSER_TYPES: ReadonlyArray<ParserType> = ['bali_baza', 'generic_gsheet', 'manual_csv']

type Params = Promise<{ complexId: string }>

// Upsert parser config for the complex.
export async function PUT(req: Request, { params }: { params: Params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { complexId } = await params
  if (!complexId) return NextResponse.json({ error: 'complex_id_required' }, { status: 400 })
  let body: Partial<{ source_url: string; parser_type: ParserType; notes: string }>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (!body.source_url || typeof body.source_url !== 'string') return NextResponse.json({ error: 'source_url_required' }, { status: 400 })
  const ptype = (body.parser_type ?? 'bali_baza') as ParserType
  if (!PARSER_TYPES.includes(ptype)) return NextResponse.json({ error: 'invalid_parser_type', accepted: PARSER_TYPES }, { status: 400 })
  try {
    const parser = await upsertParser({
      complex_id: complexId,
      source_url: body.source_url.trim(),
      parser_type: ptype,
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
