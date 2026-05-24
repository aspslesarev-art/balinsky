import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getParser, recordRun } from '@/lib/complex-parsers'
import { getParserModule } from '@/lib/parsers/_registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = Promise<{ complexId: string }>

export async function POST(_req: Request, { params }: { params: Params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { complexId } = await params
  const cfg = await getParser(complexId)
  if (!cfg) return NextResponse.json({ error: 'parser_not_configured' }, { status: 404 })
  const mod = getParserModule(complexId)
  if (!mod) return NextResponse.json({ error: 'parser_not_implemented' }, { status: 501 })

  const airtableToken = process.env.PARSERS_AIRTABLE_TOKEN || process.env.AIRTABLE_TOKEN
  if (!airtableToken) {
    await recordRun(complexId, 'error', 0, 'PARSERS_AIRTABLE_TOKEN не задан в env', 0)
    return NextResponse.json({ error: 'token_missing', detail: 'PARSERS_AIRTABLE_TOKEN не настроен в env' }, { status: 500 })
  }

  try {
    const { unitsCount, warnings, linked } = await mod.run({
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
    return NextResponse.json({ ok: true, unitsCount, warnings, linked })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'run_failed'
    await recordRun(complexId, 'error', 0, msg.slice(0, 800), 0)
    return NextResponse.json({ error: 'run_failed', detail: msg }, { status: 500 })
  }
}
