import { NextResponse } from 'next/server'
import { editorFor } from '@/lib/page-edit/access'
import { isEditKind } from '@/lib/page-edit/schema'
import { savePhotos } from '@/lib/page-edit/server'
import { editErrorResponse } from '../../../_respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PUT — весь упорядоченный список фото (добавить / убрать / поменять порядок). Body: { photos: string[] }.
export async function PUT(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  if (!isEditKind(kind)) return NextResponse.json({ error: 'unknown_kind' }, { status: 404 })
  const editor = await editorFor(kind, id)
  if (!editor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { photos?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  try {
    await savePhotos(kind, id, editor, body.photos)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return editErrorResponse(e, `PUT photos ${kind}/${id}`)
  }
}
