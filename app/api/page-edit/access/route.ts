import { NextResponse } from 'next/server'
import { editorFor } from '@/lib/page-edit/access'
import { isEditKind } from '@/lib/page-edit/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET ?kind=&id= → { canEdit }. Страница кэшируется для всех, поэтому кнопку
// «Редактировать» показывает клиент после этого лёгкого вопроса.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const kind = sp.get('kind') ?? '', id = sp.get('id') ?? ''
  if (!isEditKind(kind) || !id) return NextResponse.json({ canEdit: false })
  const editor = await editorFor(kind, id).catch(() => null)
  return NextResponse.json(
    { canEdit: !!editor, role: editor?.role ?? null },
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
