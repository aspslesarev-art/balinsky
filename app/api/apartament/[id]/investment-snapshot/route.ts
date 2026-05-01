import { NextResponse } from 'next/server'
import { buildSnapshot } from '@/lib/investment/snapshot'

export const revalidate = 600

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id || !/^rec[a-zA-Z0-9]{14,}$/.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }
  try {
    const snap = await buildSnapshot(id, 'apartment')
    if (!snap) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json(snap, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('[apartment investment-snapshot] error:', err)
    return NextResponse.json({ error: 'internal_error', message: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
