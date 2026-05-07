// Fire-and-forget endpoint that the client pings once per detail
// page mount. Records one row per view in `page_views`. No auth,
// public, write-only. Bots are filtered server-side by user-agent —
// the client tracker has its own debounce so refreshes still count
// but Strict-Mode double-effects don't.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type Kind =
  | 'villa' | 'apartment' | 'complex' | 'developer'
  | 'event' | 'promo' | 'news' | 'knowledge' | 'rental'

const VALID_KINDS = new Set<Kind>([
  'villa', 'apartment', 'complex', 'developer',
  'event', 'promo', 'news', 'knowledge', 'rental',
])

type Body = {
  kind?: Kind
  slug?: string
  title?: string | null
  airtableId?: string | null
  lang?: 'ru' | 'en'
}

// Cheap bot filter on user-agent. Catches the major crawlers without
// false-positives on real browsers. We don't want bot pageviews
// inflating the per-listing tallies.
const BOT_RE = /bot|crawler|spider|crawling|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|twitterbot|slurp|sogou|exabot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|applebot|telegrambot|whatsapp|preview/i

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? ''
  if (BOT_RE.test(ua)) return NextResponse.json({ ok: true, skipped: 'bot' })

  let body: Body
  try { body = await req.json() }
  catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  if (!body.kind || !VALID_KINDS.has(body.kind)) {
    return NextResponse.json({ ok: false, error: 'bad kind' }, { status: 400 })
  }
  if (!body.slug || typeof body.slug !== 'string') {
    return NextResponse.json({ ok: false, error: 'missing slug' }, { status: 400 })
  }

  const row = {
    kind:        body.kind,
    slug:        body.slug.slice(0, 200),
    title:       typeof body.title === 'string' ? body.title.slice(0, 300) : null,
    airtable_id: typeof body.airtableId === 'string' ? body.airtableId : null,
    lang:        body.lang === 'en' ? 'en' : 'ru',
  }

  const { error } = await sb.from('page_views').insert(row)
  if (error) {
    console.error('[track-view]', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
