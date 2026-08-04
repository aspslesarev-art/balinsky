// Lead-gated legal-audit "вопросы / что запросить" for one complex. These red
// flags never ship in the public page HTML — the visitor leaves a contact via
// /api/contact (which sets the httpOnly `bx_lead` cookie), and only then does
// this endpoint return the items, translated into the requested language.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LEGAL_QUESTIONS_FIELD, LEGAL_BALANCE_NOTES_FIELD, firstAuditString } from '@/lib/legal-audit'
import { loadComplexAudit } from '@/lib/complex-legal-i18n'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { getSessionTelegramId } from '@/lib/site-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

function hasLeadCookie(req: Request): boolean {
  const raw = req.headers.get('cookie') ?? ''
  return raw.split(';').some(c => c.trim().startsWith('bx_lead='))
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Два равноправных ключа от одного замка: оставленный контакт (кука
  // bx_lead от /api/contact) либо вход через Telegram-бота. Сессия проверяется
  // по подписи в site-auth, а не по косметическому флагу bx_auth, — иначе
  // гейт снимался бы подделкой куки в браузере.
  const unlocked = hasLeadCookie(req) || (await getSessionTelegramId()) !== null
  if (!unlocked) {
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
  const ruBalance = firstAuditString(row.data[LEGAL_BALANCE_NOTES_FIELD])
  if (!ruQuestions && !ruBalance) {
    return NextResponse.json({ items: [], balance: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { questions, balance } = await loadComplexAudit(row.airtable_id, lang, null, ruQuestions, ruBalance)
  // no-store + noindex: gated content must never be cached at the edge or
  // picked up by a crawler that stumbles onto the endpoint.
  return NextResponse.json(
    { items: questions, balance },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
  )
}
