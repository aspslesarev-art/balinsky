import { NextResponse } from 'next/server'
import { sbAdmin } from '@/lib/market/apply'
import { publishFinishExplorer } from '@/lib/finish-explorer/build'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Недельная пересборка среза для /admin/otdelka из свежих данных estatemarket
// (их синк идёт ежедневно в Supabase). Разборов фото не заказывает — бесплатно.
// Auth: Bearer CRON_SECRET, как у остальных кронов.
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return NextResponse.json({ ok: false, error: 'no_secret' }, { status: 500 })
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await publishFinishExplorer(sbAdmin())) })
  } catch (e) {
    console.error('[cron/finish-explorer]', e)
    return NextResponse.json({ ok: false, error: 'build_failed' }, { status: 500 })
  }
}
