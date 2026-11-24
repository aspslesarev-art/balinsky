import { NextResponse } from 'next/server'
import { isProSession } from '@/lib/site-auth'
import { isRecordId } from '@/lib/record-id'
import { buildSnapshot } from '@/lib/investment/snapshot'
import { computeYieldFacts } from '@/lib/listing-verdict'

// Pro-аналитика (модель дохода объекта): отвечает только сессии с Pro
// (владелец 24.11.2026) — раньше любой сборщик забирал её по id. Ответ
// зависит от сессии, поэтому не кешируется на CDN.
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isProSession())) {
    return NextResponse.json({ error: 'pro_only' }, { status: 403 })
  }
  const { id } = await params
  if (!isRecordId(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }
  try {
    const snap = await buildSnapshot(id)
    if (!snap) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    // Та же доходность, что на странице объекта, — презентация показывает её.
    return NextResponse.json({ ...snap, yieldFacts: computeYieldFacts(snap) }, {
      headers: {
        'Cache-Control': 'private, max-age=600',
      },
    })
  } catch (err) {
    console.error('[investment-snapshot] error:', err)
    return NextResponse.json({ error: 'internal_error', message: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
