// POST /api/subscriptions/draft
//
// Site-side step 1 of the saved-search flow: visitor clicks
// "🔔 Уведомлять в Telegram" with a filter set, we create a pending
// row and return a Telegram deep-link. Visitor opens it, the bot's
// /start handler claims the draft (lib/telegram-handlers.ts → sub_*).
//
// Body shape (all optional except kind):
//   { filter: { kind, district?, bedrooms_min?, bedrooms_max?,
//               price_min_usd?, price_max_usd?, str_only?,
//               max_distance_to_beach?, query? },
//     name?: string }
//
// Returns: { token, deepLink, botUsername }

import { NextResponse } from 'next/server'
import { createDraft, type SubscriptionFilter } from '@/lib/subscriptions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_KINDS = new Set(['villa', 'apartment', 'complex', 'rental'])

export async function POST(req: Request) {
  let body: { filter?: Partial<SubscriptionFilter>; name?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const f = body.filter
  if (!f || typeof f !== 'object' || typeof f.kind !== 'string' || !VALID_KINDS.has(f.kind)) {
    return NextResponse.json({ error: 'bad_filter' }, { status: 400 })
  }

  // Sanitize numeric / enum fields. We don't want to trust the client
  // shape — a malicious payload here ends up in jsonb and gets read
  // by the cron, no need to give it free rein.
  const sanitized: SubscriptionFilter = {
    kind: f.kind as SubscriptionFilter['kind'],
  }
  if (typeof f.district === 'string' && f.district.length <= 60) sanitized.district = f.district
  if (Number.isFinite(f.bedrooms_min as number)) sanitized.bedrooms_min = Number(f.bedrooms_min)
  if (Number.isFinite(f.bedrooms_max as number)) sanitized.bedrooms_max = Number(f.bedrooms_max)
  if (Number.isFinite(f.price_min_usd as number)) sanitized.price_min_usd = Number(f.price_min_usd)
  if (Number.isFinite(f.price_max_usd as number)) sanitized.price_max_usd = Number(f.price_max_usd)
  if (typeof f.str_only === 'boolean') sanitized.str_only = f.str_only
  if (typeof f.max_distance_to_beach === 'string' && ['beachfront', 'walking', 'scooter', 'any'].includes(f.max_distance_to_beach)) {
    sanitized.max_distance_to_beach = f.max_distance_to_beach as SubscriptionFilter['max_distance_to_beach']
  }
  if (typeof f.query === 'string' && f.query.length <= 80) sanitized.query = f.query

  try {
    const draft = await createDraft(sanitized, typeof body.name === 'string' ? body.name.slice(0, 80) : undefined)
    return NextResponse.json({
      token: draft.token,
      deepLink: draft.deepLink,
      botUsername: draft.botUsername,
    })
  } catch (e) {
    console.error('[subscriptions] createDraft failed:', e)
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }
}
