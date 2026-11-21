// Точечная перестройка страниц по изменившимся записям.
//
// Зовёт база сама: pg_cron → content_change_flush() (миграция 146) раз в
// 2 минуты, когда в очереди есть правки и она «успокоилась». Можно звать и
// руками / из скрипта:
//   POST /api/revalidate-rows  Authorization: Bearer $REVALIDATE_TOKEN
//   { "items": [{ "kind": "villas", "id": "rec…", "index": false }, …] }
// kind: villas | apartments | complexes | developers | manifest (id =
// "<bucket>/<файл>") | site_content (id = "<раздел>|<элемент>").
// Логика — lib/row-revalidate.ts.

import { NextResponse } from 'next/server'
import { revalidateChanges, type ChangeItem } from '@/lib/row-revalidate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_ITEMS = 5000

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_TOKEN
  if (!expected) {
    return NextResponse.json({ error: 'REVALIDATE_TOKEN is not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let items: ChangeItem[]
  try {
    const body = await request.json() as { items?: unknown }
    if (!Array.isArray(body.items)) throw new Error('items')
    items = body.items.filter((x): x is ChangeItem =>
      !!x && typeof (x as ChangeItem).kind === 'string' && typeof (x as ChangeItem).id === 'string'
      && (x as ChangeItem).id.length < 300,
    ).slice(0, MAX_ITEMS)
  } catch {
    return NextResponse.json({ error: 'bad body: expected { items: [{ kind, id }] }' }, { status: 400 })
  }

  try {
    const summary = await revalidateChanges(items)
    console.log('[revalidate-rows]', items.length, 'items →', JSON.stringify(summary))
    return NextResponse.json({ ok: true, items: items.length, ...summary })
  } catch (e) {
    // 500 → база вернёт пачку в очередь и повторит через час.
    console.error('[revalidate-rows]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
