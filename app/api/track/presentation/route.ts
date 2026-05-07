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
