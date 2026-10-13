import { NextResponse } from 'next/server'
import { draftMode } from 'next/headers'
import { currentEditor } from '@/lib/page-edit/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Режим черновика на время правки: страницы рендерятся для редактора заново
// на каждый запрос, мимо кэша. Иначе справа от формы была бы видна старая
// копия страницы, а не только что сохранённое.
export async function POST() {
  if (!(await currentEditor())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  ;(await draftMode()).enable()
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  ;(await draftMode()).disable()
  return NextResponse.json({ ok: true })
}
