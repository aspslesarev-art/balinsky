// Lead-gated legal-audit "вопросы / что запросить" for one complex. These red
// flags never ship in the public page HTML — the visitor leaves a contact via
// /api/contact (which sets the httpOnly `bx_lead` cookie), and only then does
// this endpoint return the items, translated into the requested language.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LEGAL_QUESTIONS_FIELD, firstAuditString } from '@/lib/legal-audit'
import { loadComplexAudit } from '@/lib/complex-legal-i18n'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

function hasLeadCookie(req: Request): boolean {
  const raw = req.headers.get('cookie') ?? ''
  return raw.split(';').some(c => c.trim().startsWith('bx_lead='))
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // The lead cookie is the gate: no lead, no red flags.
  if (!hasLeadCookie(req)) {
    return NextResponse.json({ error: 'locked' }, { status: 401 })
  }
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
  if (!ruQuestions) {
    return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { questions } = await loadComplexAudit(row.airtable_id, lang, null, ruQuestions)
  // no-store + noindex: gated content must never be cached at the edge or
  // picked up by a crawler that stumbles onto the endpoint.
  return NextResponse.json(
    { items: questions },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
  )
}
