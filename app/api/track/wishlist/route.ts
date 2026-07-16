// Fire-and-forget endpoint that the client pings on each "add to
// shortlist" event. Records one row per heart-tap in `wishlist_events`.
// No auth — public, write-only, identical contract to the
// presentation tracker.
//
// We intentionally don't track removes: the analytics question is
// "what do users like", and a remove is signal-poor (could be a
// misclick, a finished comparison, etc.).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LANGS, type Lang } from '@/lib/i18n'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type Body = {
  kind?: 'villa' | 'apartment' | 'complex' | 'rental'
  airtableId?: string | null
  slug?: string
  title?: string | null
  district?: string | null
  bedrooms?: number | null
  area?: number | null
  priceUsd?: number | null
  lang?: Lang
}

const VALID_KINDS = new Set(['villa', 'apartment', 'complex', 'rental'])

export async function POST(req: Request) {
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
    airtable_id: typeof body.airtableId === 'string' ? body.airtableId : null,
    slug:        body.slug,
    title:       typeof body.title === 'string' ? body.title.slice(0, 300) : null,
    district:    typeof body.district === 'string' ? body.district.slice(0, 200) : null,
    bedrooms:    typeof body.bedrooms === 'number' ? body.bedrooms : null,
    area:        typeof body.area === 'number' ? body.area : null,
    price_usd:   typeof body.priceUsd === 'number' ? body.priceUsd : null,
    lang:        body.lang && (LANGS as readonly string[]).includes(body.lang) ? body.lang : 'ru',
  }

  const { error } = await sb.from('wishlist_events').insert(row)
  if (error) {
    console.error('[track-wishlist]', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
