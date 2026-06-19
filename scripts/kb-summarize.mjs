#!/usr/bin/env node
// Generate investor-language summaries for every real catalog listing +
// developer, via Azure OpenAI, into public.assistant_kb (migration 040).
//
// The summary is BOTH the embedding source (kb-embed.mjs) and quotable
// context for the assistant. Rentals are handled by kb-embed.mjs directly
// (their manifest text is already clean — no LLM rewrite needed).
//
// Idempotent: skips rows whose source facts (source_hash) are unchanged,
// unless --force. Resumable: safe to re-run after an interruption.
// Concurrent: CONC summaries in flight at once (gpt-5.4 is ~6s/call).
//
// Usage:
//   node scripts/kb-summarize.mjs --dry-run               # print fact sheets, 0 tokens
//   node scripts/kb-summarize.mjs --sample=5              # summarize 5 of each kind, print, exit
//   node scripts/kb-summarize.mjs --only=villa --limit=50 # scope
//   node scripts/kb-summarize.mjs                         # full run
//   node scripts/kb-summarize.mjs --force                 # re-summarize everything
//   node scripts/kb-summarize.mjs --conc=12              # concurrency (default 8)

import { createClient } from '@supabase/supabase-js'
import { AzureOpenAI } from 'openai'
import {
  loadEnv, sha1, SUMMARY_SYSTEM, summaryUser,
  villaFacts, apartmentFacts, complexFacts, developerFacts,
} from './_kb-build.mjs'

loadEnv()
const argv = process.argv.slice(2)
const has = f => argv.includes(f)
const val = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null }
const DRY = has('--dry-run')
const FORCE = has('--force')
const SAMPLE = val('sample') ? parseInt(val('sample'), 10) : null
const LIMIT = val('limit') ? parseInt(val('limit'), 10) : null
const CONC = val('conc') ? parseInt(val('conc'), 10) : 8
const ONLY = val('only') ? val('only').split(',') : ['villa', 'apartment', 'complex', 'developer']

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview',
})
const CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'
const PRICE = { input: 1.25, output: 10.0 } // gpt-5.4 USD per 1M

const KINDS = {
  villa:     { table: 'raw_villas',     build: villaFacts },
  apartment: { table: 'raw_apartments', build: apartmentFacts },
  complex:   { table: 'raw_complexes',  build: complexFacts },
  developer: { table: 'raw_developers', build: developerFacts },
}

let totalPrompt = 0, totalCompletion = 0, totalCost = 0, generated = 0, skipped = 0, failed = 0
let usageLogDisabled = false

function trackUsage(pt, ct) {
  totalPrompt += pt; totalCompletion += ct
  totalCost += (pt / 1e6) * PRICE.input + (ct / 1e6) * PRICE.output
  if (DRY || usageLogDisabled || pt + ct === 0) return
  sb.from('balina_usage').insert({
    feature: 'other', deployment: CHAT, prompt_tokens: pt, completion_tokens: ct,
    audio_seconds: 0, cost_usd: (pt / 1e6) * PRICE.input + (ct / 1e6) * PRICE.output,
    meta: { job: 'kb-summarize' },
  }).then(({ error }) => {
    if (error && !usageLogDisabled) { usageLogDisabled = true; console.error(`  (balina_usage logging off: ${error.message} — cost still tracked locally)`) }
  })
}

async function summarize(factText, title) {
  const r = await ai.chat.completions.create({
    model: CHAT,
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM },
      { role: 'user', content: summaryUser(factText, title) },
    ],
    temperature: 0.3,
    max_completion_tokens: 1500, // GPT-5 family: not max_tokens; counts reasoning
  })
  trackUsage(r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0)
  return r.choices[0]?.message?.content?.trim() ?? ''
}

async function existingHashes(kind) {
  const map = new Map()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('assistant_kb').select('ref_id, source_hash').eq('kind', kind).range(from, from + 999)
    if (error) { console.error('  read kb err:', error.message); break }
    for (const r of data) map.set(r.ref_id, r.source_hash)
    if (!data.length || data.length < 1000) break
  }
  return map
}

// ---- 1. Collect pending work (cheap: DB reads + fact building) ----------
async function collectPending(kind) {
  const { table, build } = KINDS[kind]
  const seen = (SAMPLE || FORCE) ? new Map() : await existingHashes(kind)
  const items = []
  const PAGE = 200
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await sb.from(table).select('airtable_id, data').range(from, from + PAGE - 1)
    if (error) { console.error('  fetch err:', error.message); break }
    if (!data || !data.length) break
    for (const row of data) {
      const facts = build(row)
      if (!facts) continue
      const hash = sha1(facts.factText)
      if (!FORCE && !SAMPLE && seen.get(facts.refId) === hash) { skipped++; continue }
      items.push({ kind, ...facts, hash })
      if (SAMPLE && items.length >= SAMPLE) return items
      if (LIMIT && items.length >= LIMIT) return items
    }
    if (data.length < PAGE) break
  }
  return items
}

// ---- 2. Process one item: summarize + upsert ----------------------------
async function processItem(it) {
  if (DRY) {
    console.log(`\n--- ${it.kind}: ${it.title} (${it.refId}) ---\n${it.factText}`)
    generated++
    return
  }
  const summary = await summarize(it.factText, it.title)
  if (!summary) { failed++; return }
  const { error } = await sb.from('assistant_kb').upsert({
    kind: it.kind, ref_id: it.refId, slug: it.slug, title: it.title,
    summary, meta: it.meta, source_hash: it.hash,
    embedding: null, embedding_text: null, embedded_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'kind,ref_id' })
  if (error) { console.error('\n  upsert err', it.refId, error.message); failed++; return }
  generated++
  if (SAMPLE) console.log(`\n--- ${it.kind}: ${it.title} ---\nFACTS:\n${it.factText}\n\nSUMMARY:\n${summary}`)
  else process.stdout.write(`\r  ${generated} done, ${failed} failed — est $${totalCost.toFixed(3)}   `)
}

// Bounded-concurrency pool with a circuit breaker: if too many calls fail in
// a row (bad model/params/auth), stop instead of grinding the whole catalog.
async function runPool(items) {
  let idx = 0, consecutiveFails = 0, aborted = false
  async function worker() {
    while (idx < items.length && !aborted) {
      const it = items[idx++]
      try {
        const before = failed
        await processItem(it)
        if (failed > before) { if (++consecutiveFails > 8) { aborted = true; console.error('\n!! ABORT: too many failures') } }
        else consecutiveFails = 0
      } catch (e) {
        failed++; console.error('\n  err', it.refId, e.message)
        if (++consecutiveFails > 8) { aborted = true; console.error('\n!! ABORT: too many API failures (check model/params/auth)') }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, items.length || 1) }, worker))
}

console.log(`KB summarize — Azure ${CHAT}, conc=${CONC}${DRY ? ' [DRY]' : ''}${SAMPLE ? ` [SAMPLE ${SAMPLE}]` : ''}${FORCE ? ' [FORCE]' : ''}`)
const start = Date.now()
let allItems = []
for (const k of ONLY) {
  if (!KINDS[k]) continue
  const items = await collectPending(k)
  console.log(`  ${k}: ${items.length} to summarize`)
  allItems = allItems.concat(items)
}
console.log(`Total to summarize: ${allItems.length} (${skipped} unchanged skipped)`)
await runPool(allItems)
console.log(`\n========================================`)
console.log(`Done in ${Math.round((Date.now() - start) / 1000)}s — generated ${generated}, failed ${failed}, skipped ${skipped}`)
console.log(`Tokens: ${totalPrompt} in + ${totalCompletion} out = est $${totalCost.toFixed(3)}`)
if (!DRY) await new Promise(r => setTimeout(r, 1500))
