import { NextResponse } from 'next/server'
import { listDueParsers, recordRun, runBaliBazaParser } from '@/lib/complex-parsers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Each BALI BAZA run does ~6-8 Airtable requests; with a handful of
// configured parsers and a 5-minute Vercel cron we have plenty of room
// inside the default 300s timeout, but bump explicitly so a slow Sheets
// fetch can't tip a single complex over.
export const maxDuration = 300

// Vercel cron tick. Iterates all parsers with interval_minutes set and
// runs the ones whose interval has elapsed since their last run. Auth:
// Vercel sends `Authorization: Bearer <CRON_SECRET>`, same convention as
// /api/cron/sync-trigger.
//
// Required env:
//   CRON_SECRET             — random string, also in Vercel cron config
//   PARSERS_AIRTABLE_TOKEN  — PAT with write access on appPrMGM6h24IekkS
//                             (falls back to AIRTABLE_TOKEN if missing)
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
      if (cfg.parser_type !== 'bali_baza') {
        results.push({ complex_id: cfg.complex_id, status: 'error', error: 'type_not_implemented' })
        await recordRun(cfg.complex_id, 'error', 0, `Тип ${cfg.parser_type} пока не реализован`, 0)
        continue
      }
      const { unitsCount, warnings, linked } = await runBaliBazaParser({
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
