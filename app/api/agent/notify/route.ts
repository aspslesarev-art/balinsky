import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAgents, type AgentNotifySource, type AgentNotifyItem } from '@/lib/agent-notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

// Sync scripts call this after a successful upsert. The mjs scripts can't
// import the TS notification lib directly, so this endpoint is the bridge.
// Authorised by the same REVALIDATE_TOKEN the scripts already use for cache
// invalidation — no need to hand out a separate secret.
type ItemInput = {
  sourceId: string
  developerNames?: string[]
  developerIds?: string[]
  title: string
  body?: string | null
  path?: string | null
}
type Body = {
  source: AgentNotifySource
  items: ItemInput[]
}

const VALID_SOURCES = new Set<AgentNotifySource>(['news', 'promo', 'events', 'villas', 'apartments', 'complexes'])

function normalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().replace(/[^a-zа-я0-9]+/g, ' ').trim()
}

let _devLookup: { ts: number; byName: Map<string, string> } | null = null
async function lookupDeveloperIds(names: string[]): Promise<string[]> {
  if (names.length === 0) return []
  // 10-min in-process cache — sync scripts run sequentially, so warming
  // raw_developers once per request saves a roundtrip per item.
  if (!_devLookup || Date.now() - _devLookup.ts > 600_000) {
    const { data } = await sb.from('raw_developers').select('airtable_id, name:data->Developer, name_alt:data->"Имя застройщика"').limit(500)
    const byName = new Map<string, string>()
    for (const r of (data ?? []) as Array<{ airtable_id: string; name: unknown; name_alt: unknown }>) {
      for (const raw of [r.name, r.name_alt]) {
        const s = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : null
        const n = normalize(typeof s === 'string' ? s : null)
        if (n && !byName.has(n)) byName.set(n, r.airtable_id)
      }
    }
    _devLookup = { ts: Date.now(), byName }
  }
  const out = new Set<string>()
  for (const n of names) {
    const id = _devLookup.byName.get(normalize(n))
    if (id) out.add(id)
  }
  return [...out]
}

export async function POST(req: Request) {
  const expected = process.env.REVALIDATE_TOKEN
  if (!expected) return NextResponse.json({ error: 'REVALIDATE_TOKEN missing' }, { status: 500 })
  const got = req.headers.get('authorization')
  if (got !== `Bearer ${expected}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  if (!body || !VALID_SOURCES.has(body.source)) return NextResponse.json({ error: 'invalid source' }, { status: 400 })
  if (!Array.isArray(body.items)) return NextResponse.json({ error: 'items[] required' }, { status: 400 })

  const items: AgentNotifyItem[] = []
  for (const raw of body.items) {
    if (typeof raw?.sourceId !== 'string' || typeof raw?.title !== 'string') continue
    const ids = Array.isArray(raw.developerIds) ? raw.developerIds.filter((s): s is string => typeof s === 'string') : []
    const names = Array.isArray(raw.developerNames) ? raw.developerNames.filter((s): s is string => typeof s === 'string') : []
    const resolved = names.length > 0 ? await lookupDeveloperIds(names) : []
    items.push({
      sourceId: raw.sourceId,
      developerIds: [...new Set([...ids, ...resolved])],
      title: raw.title,
      body: raw.body ?? null,
      path: raw.path ?? null,
    })
  }

  const result = await notifyAgents(body.source, items)
  return NextResponse.json({ ok: true, ...result })
}
