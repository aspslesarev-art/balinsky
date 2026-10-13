import { NextResponse } from 'next/server'
import { editorFor } from '@/lib/page-edit/access'
import { isEditKind } from '@/lib/page-edit/schema'
import { loadEdit, saveEdit } from '@/lib/page-edit/server'
import { editErrorResponse } from '../../_respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ kind: string; id: string }> }

// GET — данные для человеческой формы правки страницы. 401, если не может править.
export async function GET(_req: Request, { params }: Ctx) {
  const { kind, id } = await params
  if (!isEditKind(kind)) return NextResponse.json({ error: 'unknown_kind' }, { status: 404 })
  const editor = await editorFor(kind, id)
  if (!editor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await loadEdit(kind, id, editor))
  } catch (e) {
    return editErrorResponse(e, `GET ${kind}/${id}`)
  }
}

// PATCH — { values: { <ключ поля>: значение } }, только изменённые поля.
export async function PATCH(req: Request, { params }: Ctx) {
  const { kind, id } = await params
  if (!isEditKind(kind)) return NextResponse.json({ error: 'unknown_kind' }, { status: 404 })
  const editor = await editorFor(kind, id)
  if (!editor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { values?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (!body.values || typeof body.values !== 'object' || Array.isArray(body.values)) {
    return NextResponse.json({ error: 'values_required' }, { status: 400 })
  }
  try {
    await saveEdit(kind, id, editor, body.values as Record<string, unknown>)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return editErrorResponse(e, `PATCH ${kind}/${id}`)
  }
}
