// Detect price changes between Airtable syncs and push them to agents.
//
// We store a small JSON snapshot per source (raw_villas, raw_apartments,
// raw_complexes, raw_villa_units) in Supabase Storage. Each run loads the
// previous snapshot, diffs against the freshly fetched prices, and sends
// notifications only when the number actually moved.
//
// notification_log dedupe key is `<airtable_id>:<new_price>` so a price that
// flips back to a value we've already announced doesn't re-push.
import { createClient } from '@supabase/supabase-js'
import { notifyAgents } from './_agent-notify.mjs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BUCKET = 'feeds'

function _fs(v) {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && v.length) return _fs(v[0])
  if (v && typeof v === 'object' && 'value' in v) return _fs(v.value)
  return null
}

function num(v) {
  const s = _fs(v)
  if (s == null) return null
  const n = Number(String(s).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

async function loadSnapshot(key) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`)
  if (!r.ok) return {}
  try { return await r.json() } catch { return {} }
}

async function saveSnapshot(key, payload) {
  const body = JSON.stringify(payload)
  const { error } = await sb.storage.from(BUCKET).upload(key, body, { contentType: 'application/json', upsert: true })
  if (error) console.warn(`[price-diff] snapshot upload ${key} failed:`, error.message)
}

function fmt(n) { return '$' + Math.round(n).toLocaleString('en-US') }
function pct(oldV, newV) {
  if (!oldV) return null
  return ((newV - oldV) / oldV) * 100
}

// describe: ({ id, price, fields }) => { title, path, developerNames }
export async function syncPriceChanges({ source, snapshotKey, records, describe }) {
  const prevSnap = await loadSnapshot(snapshotKey)
  const nextSnap = {}
  const changes = []
  for (const r of records) {
    const id = r.id
    const fields = r.fields ?? r
    const desc = describe({ id, fields })
    if (!desc) continue
    const price = num(desc.priceRaw)
    if (price == null) continue
    nextSnap[id] = price
    const prev = prevSnap[id]
    if (prev == null || prev === price) continue
    const delta = pct(prev, price)
    const arrow = price > prev ? '↑' : '↓'
    changes.push({
      sourceId: `${id}:${Math.round(price)}`,
      developerNames: desc.developerNames ?? [],
      title: `${desc.title}: ${fmt(prev)} → ${fmt(price)} ${arrow}${delta != null ? ' (' + (delta > 0 ? '+' : '') + delta.toFixed(1) + '%)' : ''}`,
      body: null,
      path: desc.path ?? null,
    })
  }
  if (changes.length) await notifyAgents('price_change', changes)
  await saveSnapshot(snapshotKey, nextSnap)
  if (changes.length) console.log(`[price-diff] ${source}: ${changes.length} price changes`)
}
