import { NextResponse } from 'next/server'
import { editorFor } from '@/lib/page-edit/access'
import { createComplex } from '@/lib/page-edit/server'
import { editErrorResponse } from '../../../_respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/page-edit/developer/<id>/complexes — новый ЖК у застройщика.
// Body: { values: { Project: 'Имя', ... } }.
export async function POST(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  if (kind !== 'developer') return NextResponse.json({ error: 'complexes_only_in_developer' }, { status: 400 })
  const editor = await editorFor('developer', id)
  if (!editor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { values?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const values = body.values && typeof body.values === 'object' && !Array.isArray(body.values)
    ? body.values as Record<string, unknown> : {}
  try {
    return NextResponse.json({ id: await createComplex(id, editor, values) })
  } catch (e) {
    return editErrorResponse(e, `POST complex for ${id}`)
  }
}
