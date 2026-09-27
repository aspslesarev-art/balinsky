// Legal-audit "вопросы / что запросить" for one complex, translated into the
// requested language. Open to every visitor; it lives outside the page HTML
// only so the red flags about a developer stay out of search indexes.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LEGAL_QUESTIONS_FIELD, LEGAL_BALANCE_NOTES_FIELD, firstAuditString } from '@/lib/legal-audit'
import { loadComplexAudit } from '@/lib/complex-legal-i18n'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!rateLimit(`legal:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'unconfigured' }, { status: 503 })
  }

  const { slug } = await params
  const lang = new URL(req.url).searchParams.get('lang') ?? 'ru'

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data, error } = await sb
    .from('raw_complexes')
    .select('airtable_id, data')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()
  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const row = data as { airtable_id: string; data: Record<string, unknown> }
  const ruQuestions = firstAuditString(row.data[LEGAL_QUESTIONS_FIELD])
  const ruBalance = firstAuditString(row.data[LEGAL_BALANCE_NOTES_FIELD])
  if (!ruQuestions && !ruBalance) {
    return NextResponse.json({ items: [], balance: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { questions, balance } = await loadComplexAudit(row.airtable_id, lang, null, ruQuestions, ruBalance)
  // noindex: red flags about a developer stay out of search results.
  return NextResponse.json(
    { items: questions, balance },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
  )
}
