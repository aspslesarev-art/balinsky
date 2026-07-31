#!/usr/bin/env node
// Photo audit pass over listing photos (Azure gpt-5.4 multimodal). Complements
// kb-vision.mjs: that one writes features + per-photo alt, this one answers
// "which photo should be the cover, which ones are junk, do the photos match
// the description?".
//
// Output → merged INTO the existing <bucket>/_vision.json under a new key:
//   { [airtable_id]: { features, alt_ru, alt_en,          // ← untouched
//                      audit: { cover, reject[], mismatch, at } } }
// Existing keys are never overwritten — reruns only add/replace `audit`.
//
// Usage: --dry-run | --sample=N | --only=villa | --force | --conc=6
//        --maxphotos=12 | --checkpoint=50

import { createClient } from '@supabase/supabase-js'
import { AzureOpenAI } from 'openai'
import { loadEnv } from './_kb-build.mjs'

loadEnv()
const argv = process.argv.slice(2)
const has = f => argv.includes(f)
const val = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null }
const DRY = has('--dry-run'), FORCE = has('--force')
const SAMPLE = val('sample') ? parseInt(val('sample'), 10) : null
const CONC = val('conc') ? parseInt(val('conc'), 10) : 6
const MAXPHOTOS = val('maxphotos') ? parseInt(val('maxphotos'), 10) : 12
const CHECKPOINT = val('checkpoint') ? parseInt(val('checkpoint'), 10) : 50
const ONLY = val('only') ? val('only').split(',') : ['villa', 'apartment', 'complex']

// Real Azure rates for gpt-5.4, read off Cost Management 2026-07 (the older
// 1.25/10 figures in kb-vision.mjs under-report by 2x).
const USD_IN_PER_M = 2.5
const USD_OUT_PER_M = 15

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({ apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT, apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview' })
const CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'
const BUCKETS = { villa: 'villa-photos', apartment: 'apartment-photos', complex: 'complex-photos' }
// Title fields are internal codes for villas/apartments (V00771, A3), so the
// SEO description is the only usable listing text for the mismatch check.
const TEXT_SELECT = {
  villa: ['raw_villas', 'airtable_id, descr:data->>"SEO:Description"'],
  apartment: ['raw_apartments', 'airtable_id, descr:data->>"SEO:Description"'],
  complex: ['raw_complexes', 'airtable_id, descr:data->>"Описание"'],
}

const SYS = `You are a real-estate photo editor auditing the photo set of ONE Bali property listing. Photos are given in order, numbered from 0. Return STRICT JSON (no markdown):
{
  "cover": <index of the single best cover photo>,
  "cover_reason": "<short reason, max 12 words>",
  "reject": [ { "i": <index>, "reason": "duplicate" | "screenshot" | "blurry" | "dark" | "watermark" | "irrelevant" | "document" } ],
  "mismatch": { "flag": true/false, "note": "<what contradicts the description, max 20 words, else null>" }
}
Cover rules: prefer a wide exterior/pool/main-living shot that sells the property, sharp, well-lit, no people's faces, no text overlay. Never pick a photo you also reject.
Reject rules: list ONLY photos that genuinely should not be shown — near-identical duplicates (keep the best, reject the rest), phone screenshots, floor plans or scanned documents, heavy blur, near-black shots, or a foreign agency watermark/logo. If nothing is wrong, return [].
Mismatch rules: set flag=true only on a clear contradiction with the listing text (e.g. text says "private pool" and no pool is visible anywhere, or text says "new build" and photos show a finished old house). Vagueness is not a contradiction — when unsure, flag=false, note=null.`

let cost = 0, made = 0, failed = 0, skipped = 0, usageOff = false, consec = 0

function track(pt, ct) {
  const usd = (pt / 1e6) * USD_IN_PER_M + (ct / 1e6) * USD_OUT_PER_M
  cost += usd
  if (DRY || usageOff || pt + ct === 0) return
  sb.from('balina_usage').insert({ feature: 'other', deployment: CHAT, prompt_tokens: pt, completion_tokens: ct, audio_seconds: 0, cost_usd: usd, meta: { job: 'kb-photo-audit' } })
    .then(({ error }) => { if (error && !usageOff) { usageOff = true; console.error('  (usage log off)') } })
}

// Azure fetches the image URLs itself, and the photo CDN times out on cold
// objects often enough that a single attempt loses ~1 listing in 3.
const RETRIES = 3
const isTransient = msg => /timed out|timeout|429|500|502|503|504|ECONNRESET|fetch failed/i.test(msg ?? '')

async function audit(urls, descr) {
  const intro = descr
    ? `Listing description (for the mismatch check only):\n"""${descr.slice(0, 900)}"""\n\nAudit these ${urls.length} photos, numbered 0..${urls.length - 1} in the order given.`
    : `Audit these ${urls.length} photos, numbered 0..${urls.length - 1} in the order given. No description available — set mismatch.flag=false.`
  const content = [{ type: 'text', text: intro }]
  for (const u of urls) content.push({ type: 'image_url', image_url: { url: u } })

  let lastError = null
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const r = await ai.chat.completions.create({ model: CHAT, messages: [{ role: 'system', content: SYS }, { role: 'user', content }], temperature: 0.2, max_completion_tokens: 900, response_format: { type: 'json_object' } })
      track(r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0)
      return JSON.parse(r.choices[0].message.content)
    } catch (e) {
      lastError = e
      if (!isTransient(e.message) || attempt === RETRIES) throw e
      // First retry warms the CDN cache; back off before trying again.
      await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  throw lastError
}

// Drop anything the model invented outside the real photo range, and make sure
// the cover is never also rejected.
function sanitize(j, photoCount) {
  const inRange = i => Number.isInteger(i) && i >= 0 && i < photoCount
  const reject = (Array.isArray(j?.reject) ? j.reject : [])
    .filter(r => inRange(r?.i))
    .map(r => ({ i: r.i, reason: String(r.reason ?? 'irrelevant').slice(0, 24) }))
  const rejected = new Set(reject.map(r => r.i))
  const cover = inRange(j?.cover) && !rejected.has(j.cover)
    ? j.cover
    : [...Array(photoCount).keys()].find(i => !rejected.has(i)) ?? 0
  const flag = j?.mismatch?.flag === true
  return {
    cover,
    cover_reason: String(j?.cover_reason ?? '').slice(0, 120) || null,
    reject,
    mismatch: { flag, note: flag ? (String(j?.mismatch?.note ?? '').slice(0, 200) || null) : null },
    at: new Date().toISOString().slice(0, 10),
  }
}

async function downloadManifest(bucket, key) {
  const { data, error } = await sb.storage.from(bucket).download(key)
  if (error) return null
  try { return JSON.parse(await data.text()) } catch { return null }
}
async function uploadManifest(bucket, key, obj) {
  const { error } = await sb.storage.from(bucket).upload(key, JSON.stringify(obj), { contentType: 'application/json', upsert: true })
  if (error) console.error('  upload err', bucket, error.message)
  return !error
}

async function loadDescriptions(kind) {
  const [table, select] = TEXT_SELECT[kind]
  const { data, error } = await sb.from(table).select(select)
  if (error) { console.error(`  descriptions unavailable (${error.message}) — mismatch check off`); return new Map() }
  return new Map(data.map(r => [r.airtable_id, r.descr ?? null]))
}

async function processKind(kind) {
  const bucket = BUCKETS[kind]
  console.log(`\n=== ${kind} (${bucket}) ===`)
  const photos = await downloadManifest(bucket, '_manifest.json')
  if (!photos) { console.error('  no _manifest.json'); return }
  const vision = (await downloadManifest(bucket, '_vision.json')) ?? {}
  const descriptions = await loadDescriptions(kind)

  const ids = Object.keys(photos).filter(id => (photos[id]?.length ?? 0) > 0)
  const todo = ids.filter(id => FORCE || SAMPLE || !vision[id]?.audit)
  skipped += ids.length - todo.length
  const work = SAMPLE ? todo.slice(0, SAMPLE) : todo
  console.log(`  ${ids.length} with photos, ${work.length} to audit, ${ids.length - todo.length} already done`)
  if (!work.length) return

  // Results are collected separately and merged at write time, so a crash can
  // never leave _vision.json half-rewritten and features/alt stay untouched.
  const results = new Map()
  const merged = () => Object.fromEntries(
    [...new Set([...Object.keys(vision), ...results.keys()])]
      .map(id => [id, results.has(id) ? { ...(vision[id] ?? {}), audit: results.get(id) } : vision[id]])
  )

  let idx = 0, aborted = false, sinceCheckpoint = 0
  async function worker() {
    while (idx < work.length && !aborted) {
      const id = work[idx++]
      const urls = photos[id].slice(0, MAXPHOTOS)
      try {
        const j = await audit(urls, descriptions.get(id))
        const a = sanitize(j, urls.length)
        made++; consec = 0
        if (DRY) { console.log(`\n[${id}] cover=${a.cover} (${a.cover_reason}) reject=${JSON.stringify(a.reject)} mismatch=${a.mismatch.flag}${a.mismatch.note ? ' — ' + a.mismatch.note : ''}`); continue }
        results.set(id, a)
        if (++sinceCheckpoint >= CHECKPOINT) { sinceCheckpoint = 0; await uploadManifest(bucket, '_vision.json', merged()) }
        process.stdout.write(`\r  ${made} audited, ${failed} failed — $${cost.toFixed(2)}   `)
      } catch (e) {
        failed++
        console.error('\n  err', id, e.message)
        if (++consec > 8) { aborted = true; console.error('!! ABORT — too many consecutive failures') }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, work.length) }, worker))
  if (!DRY && results.size > 0) {
    const ok = await uploadManifest(bucket, '_vision.json', merged())
    console.log(`\n  ${ok ? 'uploaded' : 'FAILED to upload'} ${bucket}/_vision.json (+${results.size} audited)`)
  }
}

console.log(`KB photo audit — Azure ${CHAT}${DRY ? ' [DRY]' : ''}${SAMPLE ? ` [SAMPLE ${SAMPLE}]` : ''}${FORCE ? ' [FORCE]' : ''} maxphotos=${MAXPHOTOS} conc=${CONC}`)
const start = Date.now()
for (const k of ONLY) { if (BUCKETS[k]) await processKind(k) }
console.log(`\nDone in ${Math.round((Date.now() - start) / 1000)}s — audited ${made}, failed ${failed}, skipped ${skipped} — spent $${cost.toFixed(2)}`)
if (!DRY) await new Promise(r => setTimeout(r, 1200))
