import { NextResponse } from 'next/server'
import { currentEditor } from '@/lib/page-edit/access'
import { isEditKind } from '@/lib/page-edit/schema'
import { uploadImage } from '@/lib/page-edit/server'
import { editErrorResponse } from '../../_respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST — multipart с `file`. Кладёт картинку в хранилище, возвращает { url };
// к записи её привязывает следующий PUT .../photos или PATCH (логотип).
export async function POST(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (!isEditKind(kind)) return NextResponse.json({ error: 'unknown_kind' }, { status: 404 })
  const editor = await currentEditor()
  if (!editor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 })
  try {
    return NextResponse.json({ url: await uploadImage(kind, editor, file) })
  } catch (e) {
    return editErrorResponse(e, `upload ${kind}`)
  }
}
