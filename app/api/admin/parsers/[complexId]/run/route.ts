import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getParser, recordRun, runBaliBazaParser } from '@/lib/complex-parsers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = Promise<{ complexId: string }>

export async function POST(_req: Request, { params }: { params: Params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { complexId } = await params
  const cfg = await getParser(complexId)
  if (!cfg) return NextResponse.json({ error: 'parser_not_configured' }, { status: 404 })

  // Source-of-truth for the writable Airtable token is env. Read-only
  // AIRTABLE_TOKEN already covers public-site syncs; PARSERS_AIRTABLE_TOKEN
  // is the PAT with write access on appPrMGM6h24IekkS (Юниты Виллы).
  const airtableToken = process.env.PARSERS_AIRTABLE_TOKEN || process.env.AIRTABLE_TOKEN
  if (!airtableToken) {
    await recordRun(complexId, 'error', 0, 'PARSERS_AIRTABLE_TOKEN не задан в env')
    return NextResponse.json({ error: 'token_missing', detail: 'PARSERS_AIRTABLE_TOKEN не настроен в env' }, { status: 500 })
  }

  try {
    if (cfg.parser_type === 'bali_baza') {
      const { unitsCount, warnings } = await runBaliBazaParser({
        complexId,
        sourceUrl: cfg.source_url,
        airtableToken,
      })
      await recordRun(
        complexId,
        'ok',
        unitsCount,
        warnings.length ? warnings.join('; ').slice(0, 800) : null,
        warnings.length,
      )
      return NextResponse.json({ ok: true, unitsCount, warnings })
    }
    if (cfg.parser_type === 'generic_gsheet' || cfg.parser_type === 'manual_csv') {
      await recordRun(complexId, 'error', 0, 'Тип парсера пока не реализован', 0)
      return NextResponse.json({ error: 'parser_type_not_implemented', type: cfg.parser_type }, { status: 501 })
    }
    return NextResponse.json({ error: 'unknown_parser_type' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'run_failed'
    await recordRun(complexId, 'error', 0, msg.slice(0, 800), 0)
    return NextResponse.json({ error: 'run_failed', detail: msg }, { status: 500 })
  }
}
