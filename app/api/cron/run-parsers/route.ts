import { NextResponse } from 'next/server'
import { listDueParsers, recordRun } from '@/lib/complex-parsers'
import { getParserModule } from '@/lib/parsers/_registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Vercel cron tick. Перебирает все парсеры с заданным интервалом, для
// каждого ищет реализацию в реестре и запускает. Auth: Bearer
// CRON_SECRET (как у /api/cron/sync-trigger).
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return NextResponse.json({ ok: false, error: 'no_secret' }, { status: 500 })
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const airtableToken = process.env.PARSERS_AIRTABLE_TOKEN || process.env.AIRTABLE_TOKEN
  if (!airtableToken) {
    return NextResponse.json({ ok: false, error: 'token_missing' }, { status: 500 })
  }

  const due = await listDueParsers()
  if (due.length === 0) return NextResponse.json({ ok: true, ran: 0 })

  const results: Array<{ complex_id: string; status: 'ok' | 'error'; units?: number; warnings?: number; linked?: number; error?: string }> = []
  for (const cfg of due) {
    try {
      const mod = getParserModule(cfg.complex_id)
      if (!mod) {
        results.push({ complex_id: cfg.complex_id, status: 'error', error: 'parser_not_implemented' })
        await recordRun(cfg.complex_id, 'error', 0, 'Парсер удалён из реестра', 0)
        continue
      }
      const { unitsCount, warnings, linked } = await mod.run({
        complexId: cfg.complex_id,
        sourceUrl: cfg.source_url,
        airtableToken,
      })
      await recordRun(
        cfg.complex_id,
        'ok',
        unitsCount,
        warnings.length ? warnings.join('; ').slice(0, 800) : null,
        warnings.length,
      )
      results.push({ complex_id: cfg.complex_id, status: 'ok', units: unitsCount, warnings: warnings.length, linked })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'run_failed'
      await recordRun(cfg.complex_id, 'error', 0, msg.slice(0, 800), 0)
      results.push({ complex_id: cfg.complex_id, status: 'error', error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    ran: results.length,
    ok_count: results.filter(r => r.status === 'ok').length,
    error_count: results.filter(r => r.status === 'error').length,
    results,
  })
}
