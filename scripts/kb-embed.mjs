#!/usr/bin/env node
// Embed assistant_kb summaries into the pgvector column, and ingest rentals
// directly from the rental/_rental.json manifest (their text is already clean,
// so no LLM summary step — see _kb-build.rentalEmbedRecord).
//
// Embeds every row whose `embedding IS NULL` (kb-summarize sets it to NULL when
// a summary changes, so this also re-embeds stale rows). --force re-embeds all.
//
// Usage:
//   node scripts/kb-embed.mjs                 # ingest rentals + embed everything pending
//   node scripts/kb-embed.mjs --only=rental   # just (re)ingest + embed rentals
//   node scripts/kb-embed.mjs --skip-rentals  # embed pending catalog/dev/aggregates only
//   node scripts/kb-embed.mjs --force         # re-embed all rows
//
// PAID (OpenAI): the rental plan and pending count are read first (free);
// without --yes-paid the script prints the count and stops before writing
// anything — ingesting rentals nulls their embedding, so it must not run
// without the embed step that follows. Model pinned in _openai.mjs:
// text-embedding-3-large @1536.

import { createClient } from '@supabase/supabase-js'
import { embed, EMBEDDINGS_MODEL, EMBEDDING_DIMS, requirePaid } from './_openai.mjs'
import { loadEnv, rentalEmbedRecord } from './_kb-build.mjs'

loadEnv()
const argv = process.argv.slice(2)
const has = f => argv.includes(f)
const val = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null }
const FORCE = has('--force')
const ONLY = val('only') ? val('only').split(',') : null
const SKIP_RENTALS = has('--skip-rentals') || (ONLY && !ONLY.includes('rental'))

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const DEPL = EMBEDDINGS_MODEL
const PRICE_IN = 0.13 // text-embedding-3-large USD per 1M

let totalTokens = 0, embedded = 0

let usageLogDisabled = false
async function embedBatch(texts) {
  const r = await embed(texts.map(t => (t || ' ').slice(0, 8000)))
  totalTokens += r.usage?.prompt_tokens ?? 0
  if (r.usage?.prompt_tokens && !usageLogDisabled) {
    sb.from('balina_usage').insert({
      feature: 'embed-backfill', deployment: DEPL,
      prompt_tokens: r.usage.prompt_tokens, completion_tokens: 0, audio_seconds: 0,
      cost_usd: (r.usage.prompt_tokens / 1e6) * PRICE_IN, meta: { job: 'kb-embed' },
    }).then(({ error }) => {
      if (error && !usageLogDisabled) { usageLogDisabled = true; console.error(`  (balina_usage logging off: ${error.message})`) }
    })
  }
  return r.data.map(d => d.embedding)
}

// ---- 1. Ingest rentals from the manifest -------------------------------
// Plan (free): which rentals are new/changed. Nothing is written here.
async function planRentals() {
  console.log('\n=== rentals (manifest → assistant_kb) ===')
  const { data, error } = await sb.storage.from('rental').download('_rental.json')
  if (error) { console.error('  manifest download failed:', error.message); return { batch: [], total: 0 } }
  const arr = JSON.parse(await data.text())
  const list = Array.isArray(arr) ? arr : (arr.items || arr.rentals || arr.listings || [])
  // Existing hashes to skip unchanged rentals.
  const seen = new Map()
  if (!FORCE) {
    for (let from = 0; ; from += 1000) {
      const { data: rows } = await sb.from('assistant_kb').select('ref_id, source_hash').eq('kind', 'rental').range(from, from + 999)
      for (const r of rows || []) seen.set(r.ref_id, r.source_hash)
      if (!rows || rows.length < 1000) break
    }
  }
  const batch = []
  for (const r of list) {
    const rec = rentalEmbedRecord(r)
    if (!rec) continue
    if (!FORCE && seen.get(rec.refId) === rec.source_hash) continue
    batch.push({
      kind: 'rental', ref_id: rec.refId, slug: rec.slug, title: rec.title,
      summary: rec.summary, meta: rec.meta, source_hash: rec.source_hash,
      embedding: null, embedding_text: null, embedded_at: null,
      updated_at: new Date().toISOString(),
    })
  }
  console.log(`  rentals new/changed: ${batch.length} of ${list.length}`)
  return { batch, total: list.length }
}
async function ingestRentals({ batch, total }) {
  let upserted = 0
  for (let i = 0; i < batch.length; i += 500) {
    const slice = batch.slice(i, i + 500)
    await flush(slice); upserted += slice.length
    process.stdout.write(`\r  upserted ${upserted}`)
  }
  console.log(`\n  rentals upserted (new/changed): ${upserted} of ${total}`)
}

// Free count of rows the embed step will send.
async function countPending() {
  let q = sb.from('assistant_kb').select('id', { count: 'exact', head: true })
  if (!FORCE) q = q.is('embedding', null)
  if (ONLY) q = q.in('kind', ONLY)
  const { count, error } = await q
  if (error) throw new Error(`count assistant_kb: ${error.message}`)
  return count ?? 0
}
async function flush(batch) {
  const { error } = await sb.from('assistant_kb').upsert(batch, { onConflict: 'kind,ref_id' })
  if (error) console.error('  rental upsert err:', error.message)
}

// ---- 2. Embed all rows with NULL embedding -----------------------------
async function embedPending() {
  console.log('\n=== embedding pending rows ===')
  const kindFilter = ONLY
  let afterId = 0
  while (true) {
    // Cursor by id so --force (where embedding never becomes null) still
    // advances instead of re-selecting the same first page forever.
    let q = sb.from('assistant_kb').select('id, summary, kind').gt('id', afterId).order('id', { ascending: true }).limit(400)
    if (!FORCE) q = q.is('embedding', null)
    if (kindFilter) q = q.in('kind', kindFilter)
    const { data, error } = await q
    if (error) { console.error('  select err:', error.message); break }
    if (!data || !data.length) break
    afterId = data[data.length - 1].id

    const BATCH = 16
    for (let i = 0; i < data.length; i += BATCH) {
      const chunk = data.slice(i, i + BATCH)
      const vecs = await embedBatch(chunk.map(r => r.summary))
      for (let j = 0; j < chunk.length; j++) {
        const literal = '[' + vecs[j].join(',') + ']'
        const { error: upErr } = await sb.from('assistant_kb').update({
          embedding: literal, embedding_text: chunk[j].summary, embedded_at: new Date().toISOString(),
        }).eq('id', chunk[j].id)
        if (upErr) console.error('  upd err', chunk[j].id, upErr.message)
        else embedded++
      }
      process.stdout.write(`\r  embedded ${embedded} — est $${((totalTokens / 1e6) * PRICE_IN).toFixed(3)}`)
    }
  }
  console.log()
}

console.log(`KB embed — OpenAI ${DEPL}@${EMBEDDING_DIMS}${FORCE ? ' [FORCE]' : ''}`)
const start = Date.now()
const rentals = SKIP_RENTALS ? null : await planRentals()
const pendingNow = await countPending()
// Upper bound: a changed rental that is already pending is counted twice.
requirePaid({ what: `эмбеддинги базы знаний ${DEPL}@${EMBEDDING_DIMS}`, items: pendingNow + (rentals?.batch.length ?? 0) })
if (rentals) await ingestRentals(rentals)
await embedPending()
console.log(`\nDone in ${Math.round((Date.now() - start) / 1000)}s — embedded ${embedded}, ${totalTokens} tokens, est $${((totalTokens / 1e6) * PRICE_IN).toFixed(3)}`)
await new Promise(r => setTimeout(r, 1500))
