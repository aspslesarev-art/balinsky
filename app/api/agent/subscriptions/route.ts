import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyInitData } from '@/lib/telegram-webapp-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

function authenticate(initData: string | null): number | null {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !initData) return null
  const user = verifyInitData(initData, token)
  return user?.id ?? null
}

// GET — current subscriptions for the calling agent.
// initData lives in the `x-telegram-initdata` header so it doesn't end up in
// CDN cache keys or access logs.
export async function GET(req: Request) {
  const userId = authenticate(req.headers.get('x-telegram-initdata'))
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data, error } = await sb
    .from('agent_developer_subscriptions')
    .select('developer_airtable_id')
    .eq('telegram_user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ developerIds: (data ?? []).map(r => r.developer_airtable_id) })
}

// POST — replace the agent's subscription set with the provided list.
// Body: { developerIds: string[] }
export async function POST(req: Request) {
  const userId = authenticate(req.headers.get('x-telegram-initdata'))
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { developerIds?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  if (!Array.isArray(body.developerIds)) return NextResponse.json({ error: 'developerIds[] required' }, { status: 400 })
  const ids = body.developerIds.filter((s): s is string => typeof s === 'string' && /^rec[a-zA-Z0-9]+$/.test(s)).slice(0, 200)

  // Two-step: delete the user's current set, insert the new set. Wrapping
  // both in a single SQL transaction would be nicer, but supabase-js can't
  // do client-side transactions — and the small race window only matters
  // if the same agent POSTs twice in the same second, which the UI prevents.
  const { error: delErr } = await sb.from('agent_developer_subscriptions').delete().eq('telegram_user_id', userId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  if (ids.length > 0) {
    const rows = ids.map(developer_airtable_id => ({ telegram_user_id: userId, developer_airtable_id }))
    const { error: insErr } = await sb.from('agent_developer_subscriptions').insert(rows)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, count: ids.length })
}
