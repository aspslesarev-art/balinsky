// Fire-and-forget endpoint that the client pings right after a PDF
// presentation is generated in the browser. Records one row per
// download in `presentation_events`. No auth — public, idempotent on
// the client side, write-only.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type ShortlistItemDetail = {
  id?: string | null
  kind?: 'villa' | 'apartment' | 'complex' | 'rental' | null
  slug?: string | null
  title?: string | null
  district?: string | null
  bedrooms?: number | null
  area?: number | null
  priceUsd?: number | null
}

type Body = {
  kind?: 'object' | 'shortlist'
  // For 'object'
  objectKind?: 'villa' | 'apartment' | 'complex'
  objectId?: string
  slug?: string
  title?: string
  // For 'shortlist'
  itemCount?: number
  items?: string[]
  itemsDetail?: ShortlistItemDetail[]
  // Agent contact when the visitor downloaded the "for-agent" PDF.
  agent?: { name?: string; telegram?: string; whatsapp?: string } | null
  // Common context
  orientation?: 'portrait' | 'landscape'
  hasAgent?: boolean
  lang?: 'ru' | 'en'
}

export async function POST(req: Request) {
  let body: Body
  try { body = await req.json() }
  catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  if (body.kind !== 'object' && body.kind !== 'shortlist') {
    return NextResponse.json({ ok: false, error: 'bad kind' }, { status: 400 })
  }

  const row: Record<string, unknown> = {
    kind: body.kind,
    orientation: body.orientation === 'portrait' ? 'portrait' : 'landscape',
    has_agent: body.hasAgent === true,
    lang: body.lang === 'en' ? 'en' : 'ru',
  }

  // Agent contact stored only when the visitor explicitly generated
  // the "for-agent" PDF. A regular shortlist download has agent: null
  // and these stay null. Stripped to non-empty strings.
  if (body.agent && typeof body.agent === 'object') {
    const a = body.agent
    if (typeof a.name === 'string'     && a.name.trim())     row.agent_name     = a.name.trim().slice(0, 200)
    if (typeof a.telegram === 'string' && a.telegram.trim()) row.agent_telegram = a.telegram.trim().slice(0, 200)
    if (typeof a.whatsapp === 'string' && a.whatsapp.trim()) row.agent_whatsapp = a.whatsapp.trim().slice(0, 200)
  }

  if (body.kind === 'object') {
    if (!body.objectId) {
      return NextResponse.json({ ok: false, error: 'missing objectId' }, { status: 400 })
    }
    row.object_kind = body.objectKind ?? null
    row.object_id   = body.objectId
    row.slug        = body.slug ?? null
    row.title       = body.title ?? null
  } else {
    // shortlist — items[] capped at 30 to keep rows compact; counts
    // are still accurate via item_count regardless of array length.
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : []
    row.item_count = typeof body.itemCount === 'number' ? body.itemCount : items.length
    row.items      = items
    // Per-item snapshot (title, kind, slug, district, price). Capped
    // at 30 items, sanitised to known keys.
    if (Array.isArray(body.itemsDetail)) {
      row.items_detail = body.itemsDetail.slice(0, 30).map(d => ({
        id:        typeof d.id === 'string' ? d.id : null,
        kind:      typeof d.kind === 'string' ? d.kind : null,
        slug:      typeof d.slug === 'string' ? d.slug : null,
        title:     typeof d.title === 'string' ? d.title.slice(0, 300) : null,
        district:  typeof d.district === 'string' ? d.district.slice(0, 200) : null,
        bedrooms:  typeof d.bedrooms === 'number' ? d.bedrooms : null,
        area:      typeof d.area === 'number' ? d.area : null,
        priceUsd:  typeof d.priceUsd === 'number' ? d.priceUsd : null,
      }))
    }
  }

  const { error } = await sb.from('presentation_events').insert(row)
  if (error) {
    // Don't surface error details to clients; this is fire-and-forget
    // and we don't want the visitor to see anything when ingest fails.
    console.error('[track-presentation]', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
