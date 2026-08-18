import { NextResponse } from 'next/server'
import { syncSources } from '@/lib/market/sync-sources'
import { scanBatch } from '@/lib/market/scan'
import { sbAdmin } from '@/lib/market/apply'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Тик трекера рынка. Обходит порцию прайсов застройщиков и сводит свежий
// срез с историей. Auth: Bearer CRON_SECRET (как у остальных cron-хуков).
//
//   ?sync=1   — перед обходом перечитать мастер-таблицу
//   ?limit=N  — сколько источников взять за тик (по умолчанию 12)
//   ?key=...  — прогнать один конкретный источник, игнорируя расписание
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return NextResponse.json({ ok: false, error: 'no_secret' }, { status: 500 })
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '12') || 12, 40)
  const sourceKey = url.searchParams.get('key') ?? undefined

  const sb = sbAdmin()
  let sync = null
  if (url.searchParams.get('sync') === '1') {
    try {
      sync = await syncSources(sb)
    } catch (e) {
      // Обход осмысленен и на прежнем реестре, поэтому падение синка не
      // должно ронять весь тик.
      sync = { error: e instanceof Error ? e.message : 'sync_failed' }
    }
  }

  try {
    const result = await scanBatch(sb, {
      limit,
      sourceKey,
      // Точечный прогон запрашивают вручную — расписание тут только мешает.
      staleHours: sourceKey ? 0 : undefined,
    })
    // У ScanResult своё поле ok (сколько источников прошло) — разводим
    // его с флагом успеха самого запроса.
    const { ok: sourcesOk, ...rest } = result
    return NextResponse.json({ ok: true, sync, sources_ok: sourcesOk, ...rest })
  } catch (e) {
    return NextResponse.json({ ok: false, sync, error: e instanceof Error ? e.message : 'scan_failed' }, { status: 500 })
  }
}
