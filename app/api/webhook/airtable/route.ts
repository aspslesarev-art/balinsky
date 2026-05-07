import { revalidateTag, revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Per-record live sync from Airtable. The cron pipelines stay as a
// fallback, but this endpoint lets an Airtable Automation push a
// change into Supabase + revalidate the corresponding page in
// seconds.
//
// Two flavours of content:
//
//   SQL-backed (villas / apartments / complexes / rentals /
//   developers): we re-fetch the single record from Airtable and
//   upsert into raw_<table>. Real per-record latency, ~1–3 s.
//
//   Manifest-backed (events / news / promo / knowledge / managers):
//   data lives as a JSON manifest in Supabase Storage, built by
//   sync-<type>.mjs. Patching one row inside the manifest would
//   duplicate the build logic for each type, so we instead dispatch
//   the existing GitHub Actions sync-fast.yml workflow. End-to-end
//   latency ~30–60 s once GH queues + runs the action.
//
// Request:
//   POST /api/webhook/airtable
//   Headers: x-webhook-token: <AIRTABLE_WEBHOOK_TOKEN>
//   Body:    { "table": "villas|apartments|complexes|rentals|
//                        developers|events|news|promo|knowledge|
//                        managers",
//              "recordId": "recXXXXXXXXXXXXXX",
//              "deleted": false }
//
// Airtable side: Automation → "When record updated" trigger →
// "Send web request" action with body shape above.

type TableConfig = {
  airtableBase: string
  airtableTable: string
  supabaseTable: string
  revalidateTag: string
  revalidatePaths: { path: string; type?: 'page' | 'layout' }[]
}

const TABLES: Record<string, TableConfig> = {
  villas: {
    airtableBase: 'appAwgCAwOIQs2DJh',
    airtableTable: 'tblRD00AhDNrpW3DA',
    supabaseTable: 'raw_villas',
    revalidateTag: 'content:villas',
    revalidatePaths: [
      { path: '/ru/villy' },
      { path: '/en/villas' },
      { path: '/ru/villy/o/[slug]', type: 'page' },
      { path: '/en/villas/o/[slug]', type: 'page' },
    ],
  },
  apartments: {
    airtableBase: 'appK9z6iue7wRtEIS',
    airtableTable: 'tblRD00AhDNrpW3DA',
    supabaseTable: 'raw_apartments',
    revalidateTag: 'content:apartments',
    revalidatePaths: [
      { path: '/ru/apartamenty' },
      { path: '/en/apartments' },
      { path: '/ru/apartamenty/o/[slug]', type: 'page' },
      { path: '/en/apartments/o/[slug]', type: 'page' },
    ],
  },
  complexes: {
    airtableBase: 'applhWe0pCVRue9QC',
    airtableTable: 'Комплексы',
    supabaseTable: 'raw_complexes',
    revalidateTag: 'content:complexes',
    revalidatePaths: [
      { path: '/ru/zhilye-kompleksy' },
      { path: '/en/complexes' },
      { path: '/ru/zhilye-kompleksy/o/[slug]', type: 'page' },
      { path: '/en/complexes/o/[slug]', type: 'page' },
    ],
  },
  rentals: {
    airtableBase: 'appyFZnbPPGh29e1h',
    airtableTable: 'tblv9FD65h8SQi8M0',
    supabaseTable: 'raw_rentals',
    revalidateTag: 'content:rental',
    revalidatePaths: [
      { path: '/ru/arenda' },
      { path: '/ru/arenda/o/[slug]', type: 'page' },
    ],
  },
  // Developer base mirrors the Airtable structure used by the
  // catalog cards' "Developer" link target. raw_developers is
  // queried directly by /admin/* and homepage developer counts.
  developers: {
    airtableBase: 'applhWe0pCVRue9QC',
    airtableTable: 'Imported table',
    supabaseTable: 'raw_developers',
    revalidateTag: 'content:developers',
    revalidatePaths: [
      { path: '/ru/zastrojshhiki' },
      { path: '/en/developers' },
      { path: '/ru/zastrojshhiki/[slug]', type: 'page' },
      { path: '/en/developers/[slug]', type: 'page' },
    ],
  },
}

// Manifest-backed content types: data lives as a JSON file in
// Supabase Storage, built by their respective sync-<type>.mjs
// script. We can't patch one record inline without copying the
// full build logic, so we delegate to the GitHub Actions
// sync-fast.yml workflow. The webhook returns immediately; the
// workflow rebuilds + revalidates within ~30–60 s.
const MANIFEST_TABLES = new Set(['events', 'news', 'promo', 'knowledge', 'managers'])
const MANIFEST_REVALIDATE_TAGS: Record<string, string> = {
  events:    'content:events',
  news:      'content:news',
  promo:     'content:promo',
  knowledge: 'content:knowledge',
  managers:  'content:managers',
}

async function dispatchSyncFastWorkflow(): Promise<{ ok: boolean; status: number; error?: string }> {
  const token = process.env.GH_DISPATCH_TOKEN
  const repo = process.env.GH_DISPATCH_REPO ?? 'aspslesarev-art/balinsky'
  if (!token) return { ok: false, status: 500, error: 'GH_DISPATCH_TOKEN not configured' }
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/sync-fast.yml/dispatches`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${token}`,
      'accept': 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main' }),
  })
  if (r.status === 204) return { ok: true, status: 204 }
  const text = await r.text().catch(() => '')
  return { ok: false, status: r.status, error: text.slice(0, 300) }
}

async function fetchAirtableRecord(cfg: TableConfig, recordId: string, token: string) {
  const url = `https://api.airtable.com/v0/${cfg.airtableBase}/${encodeURIComponent(cfg.airtableTable)}/${recordId}`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`airtable ${r.status}: ${await r.text().catch(() => '')}`)
  return r.json() as Promise<{ id: string; fields: Record<string, unknown> }>
}

export async function POST(request: Request) {
  const expected = process.env.AIRTABLE_WEBHOOK_TOKEN
  if (!expected) {
    return NextResponse.json({ error: 'AIRTABLE_WEBHOOK_TOKEN is not configured' }, { status: 500 })
  }
  const provided = request.headers.get('x-webhook-token') ?? ''
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const airtableToken = process.env.AIRTABLE_TOKEN
  if (!airtableToken) {
    return NextResponse.json({ error: 'AIRTABLE_TOKEN is not configured' }, { status: 500 })
  }
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_KEY
  if (!supaUrl || !supaKey) {
    return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 })
  }

  let body: { table?: string; recordId?: string; deleted?: boolean }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const tableKey = body.table?.trim().toLowerCase()
  const recordId = body.recordId?.trim()
  if (!tableKey) {
    return NextResponse.json({ error: 'missing_fields', need: ['table'] }, { status: 400 })
  }

  // Manifest-backed types short-circuit through the GH Actions
  // dispatch — we don't need a recordId to rebuild the full feed.
  if (MANIFEST_TABLES.has(tableKey)) {
    const dispatch = await dispatchSyncFastWorkflow()
    if (!dispatch.ok) {
      return NextResponse.json({ error: 'gh_dispatch_failed', status: dispatch.status, message: dispatch.error }, { status: 502 })
    }
    // Best-effort revalidate of the cache tag immediately — the
    // workflow will revalidate again when it finishes, but this
    // shaves the first cycle off the visitor-facing latency once
    // the manifest lands.
    const tag = MANIFEST_REVALIDATE_TAGS[tableKey]
    if (tag) revalidateTag(tag, 'max')
    return NextResponse.json({ ok: true, action: 'workflow_dispatched', table: tableKey, recordId: recordId ?? null })
  }

  if (!recordId) {
    return NextResponse.json({ error: 'missing_fields', need: ['recordId'] }, { status: 400 })
  }
  const cfg = TABLES[tableKey]
  if (!cfg) {
    return NextResponse.json({ error: 'unknown_table', got: tableKey, expected: [...Object.keys(TABLES), ...MANIFEST_TABLES] }, { status: 400 })
  }
  if (!/^rec[a-zA-Z0-9]{14,}$/.test(recordId)) {
    return NextResponse.json({ error: 'invalid_record_id' }, { status: 400 })
  }

  const sb = createClient(supaUrl, supaKey)

  // Delete path: editor unpublished/removed the record. We just drop
  // it from Supabase. Revalidation hides it from listings on the
  // next page render.
  if (body.deleted === true) {
    const { error } = await sb.from(cfg.supabaseTable).delete().eq('airtable_id', recordId)
    if (error) {
      return NextResponse.json({ error: 'supabase_delete_failed', message: error.message }, { status: 500 })
    }
    revalidateTag(cfg.revalidateTag, 'max')
    for (const r of cfg.revalidatePaths) revalidatePath(r.path, r.type)
    return NextResponse.json({ ok: true, action: 'deleted', table: tableKey, recordId })
  }

  // Update path: pull the latest record from Airtable and upsert.
  let record: { id: string; fields: Record<string, unknown> } | null
  try {
    record = await fetchAirtableRecord(cfg, recordId, airtableToken)
  } catch (e) {
    return NextResponse.json({ error: 'airtable_fetch_failed', message: e instanceof Error ? e.message : 'unknown' }, { status: 502 })
  }
  if (!record) {
    // Airtable returned 404 — record was deleted between trigger and
    // our fetch. Treat as a delete.
    const { error } = await sb.from(cfg.supabaseTable).delete().eq('airtable_id', recordId)
    if (error) {
      return NextResponse.json({ error: 'supabase_delete_failed', message: error.message }, { status: 500 })
    }
    revalidateTag(cfg.revalidateTag, 'max')
    for (const r of cfg.revalidatePaths) revalidatePath(r.path, r.type)
    return NextResponse.json({ ok: true, action: 'deleted_via_404', table: tableKey, recordId })
  }

  const row = {
    airtable_id: record.id,
    data: record.fields,
    synced_at: new Date().toISOString(),
  }
  const { error } = await sb.from(cfg.supabaseTable).upsert(row, { onConflict: 'airtable_id' })
  if (error) {
    return NextResponse.json({ error: 'supabase_upsert_failed', message: error.message }, { status: 500 })
  }

  revalidateTag(cfg.revalidateTag, 'max')
  for (const r of cfg.revalidatePaths) revalidatePath(r.path, r.type)
  return NextResponse.json({ ok: true, action: 'upserted', table: tableKey, recordId })
}
