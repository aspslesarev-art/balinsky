import { NextResponse } from 'next/server'
import { editorFor } from '@/lib/page-edit/access'
import { createUnit } from '@/lib/page-edit/server'
import { editErrorResponse } from '../../../_respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/page-edit/complex/<id>/units — новый юнит в ЖК.
// Body: { unitKind: 'villa' | 'apartment', values: {...} }.
export async function POST(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  if (kind !== 'complex') return NextResponse.json({ error: 'units_only_in_complex' }, { status: 400 })
  const editor = await editorFor('complex', id)
  if (!editor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { unitKind?: unknown; values?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (body.unitKind !== 'villa' && body.unitKind !== 'apartment') {
    return NextResponse.json({ error: 'bad_unit_kind' }, { status: 400 })
  }
  const values = body.values && typeof body.values === 'object' && !Array.isArray(body.values)
    ? body.values as Record<string, unknown> : {}
  try {
    const newId = await createUnit(id, body.unitKind, editor, values)
    return NextResponse.json({ id: newId })
  } catch (e) {
    return editErrorResponse(e, `POST unit in ${id}`)
  }
}
