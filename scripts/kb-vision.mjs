#!/usr/bin/env node
// Vision pass over listing photos (Azure gpt-5.4 multimodal). Per listing,
// sends up to N photos and extracts a CONTROLLED-VOCABULARY feature set
// (pool/view/amenities/condition/style) that powers new catalog filters, plus
// per-photo alt text (RU+EN) for image SEO/accessibility.
//
// Output → Storage manifest per bucket: <bucket>/_vision.json
//   { [airtable_id]: { features: {...}, alt_ru: [..aligned to photos..], alt_en: [...] } }
// No DB migration (mirrors villa-photos/_styles.json).
//
// Usage: --dry-run | --sample=N | --only=villa | --force | --conc=6 | --maxphotos=5

import fs from 'node:fs'
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
const MAXPHOTOS = val('maxphotos') ? parseInt(val('maxphotos'), 10) : 5
const ONLY = val('only') ? val('only').split(',') : ['villa', 'apartment', 'complex']

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({ apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT, apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview' })
const CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'
const BUCKETS = { villa: 'villa-photos', apartment: 'apartment-photos', complex: 'complex-photos' }

// Controlled vocabulary — keep keys STABLE; the catalog filters key off these.
const SYS = `You are a real-estate photo analyst. You are given several photos of ONE Bali property listing. Look at them and return STRICT JSON (no markdown):
{
 "features": {
   "pool": true/false,
   "pool_type": "infinity" | "private" | "shared" | null,
   "view": [subset of "ocean","jungle","rice_field","garden","pool","city"],
   "outdoor": [subset of "garden","rooftop_terrace","terrace","bbq","parking"],
   "amenities": [subset of "jacuzzi","gym","coworking","sauna","kids"],
   "style": one of "modern","minimalist","tropical","balinese","loft","luxury","scandinavian" or null,
   "condition": "new" | "good" | "dated",
   "furnished": true/false
 },
 "alt_ru": [ "<short RU alt for photo 1>", ... one per photo provided ],
 "alt_en": [ "<short EN alt for photo 1>", ... one per photo provided ]
}
Rules: judge ONLY from what is visibly shown — if unsure, use false / [] / null, do not guess. alt text: 4-9 words, describe the actual scene (e.g. "Бассейн-инфинити с видом на джунгли" / "Infinity pool overlooking the jungle"). Return exactly as many alt items as photos given, in order.`

let cost = 0, made = 0, failed = 0, skipped = 0, usageOff = false, consec = 0
function track(pt, ct) {
  cost += (pt / 1e6) * 1.25 + (ct / 1e6) * 10
  if (DRY || usageOff || pt + ct === 0) return
  sb.from('balina_usage').insert({ feature: 'other', deployment: CHAT, prompt_tokens: pt, completion_tokens: ct, audio_seconds: 0, cost_usd: (pt / 1e6) * 1.25 + (ct / 1e6) * 10, meta: { job: 'kb-vision' } }).then(({ error }) => { if (error && !usageOff) { usageOff = true; console.error('  (usage log off)') } })
}

async function analyze(urls) {
  const content = [{ type: 'text', text: `Analyze these ${urls.length} photos of one listing.` }]
  for (const u of urls) content.push({ type: 'image_url', image_url: { url: u } })
  const r = await ai.chat.completions.create({ model: CHAT, messages: [{ role: 'system', content: SYS }, { role: 'user', content }], temperature: 0.2, max_completion_tokens: 1500, response_format: { type: 'json_object' } })
  track(r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0)
  return JSON.parse(r.choices[0].message.content)
}

async function downloadManifest(bucket, key) {
  const { data, error } = await sb.storage.from(bucket).download(key)
  if (error) return null
  try { return JSON.parse(await data.text()) } catch { return null }
}
async function uploadManifest(bucket, key, obj) {
  const { error } = await sb.storage.from(bucket).upload(key, JSON.stringify(obj), { contentType: 'application/json', upsert: true })
  if (error) console.error('  upload err', bucket, error.message)
}

async function processKind(kind) {
  const bucket = BUCKETS[kind]
  console.log(`\n=== ${kind} (${bucket}) ===`)
  const photos = await downloadManifest(bucket, '_manifest.json')
  if (!photos) { console.error('  no _manifest.json'); return }
  const out = (FORCE || SAMPLE) ? {} : (await downloadManifest(bucket, '_vision.json')) ?? {}
  const ids = Object.keys(photos).filter(id => (photos[id]?.length ?? 0) > 0)
  const todo = ids.filter(id => FORCE || SAMPLE || !out[id])
  skipped += ids.length - todo.length
  const work = SAMPLE ? todo.slice(0, SAMPLE) : todo
  console.log(`  ${ids.length} with photos, ${work.length} to analyze`)

  let idx = 0, aborted = false
  async function worker() {
    while (idx < work.length && !aborted) {
      const id = work[idx++]
      const urls = photos[id].slice(0, MAXPHOTOS)
      try {
        const j = await analyze(urls)
        if (!j?.features) throw new Error('no features')
        if (DRY) { console.log(`\n[${id}] features:`, JSON.stringify(j.features), '\n  alt_ru[0]:', j.alt_ru?.[0]); made++; consec = 0; continue }
        out[id] = { features: j.features, alt_ru: j.alt_ru ?? [], alt_en: j.alt_en ?? [] }
        made++; consec = 0
        process.stdout.write(`\r  ${made} analyzed, ${failed} failed — est $${cost.toFixed(2)}   `)
      } catch (e) { failed++; console.error('\n  err', id, e.message); if (++consec > 8) { aborted = true; console.error('!! ABORT') } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, work.length || 1) }, worker))
  if (!DRY && made > 0) { await uploadManifest(bucket, '_vision.json', out); console.log(`\n  uploaded ${bucket}/_vision.json (${Object.keys(out).length} listings)`) }
}

console.log(`KB vision — Azure ${CHAT}${DRY ? ' [DRY]' : ''}${SAMPLE ? ` [SAMPLE ${SAMPLE}]` : ''}${FORCE ? ' [FORCE]' : ''} maxphotos=${MAXPHOTOS}`)
const start = Date.now()
for (const k of ONLY) { if (BUCKETS[k]) await processKind(k) }
console.log(`\nDone in ${Math.round((Date.now() - start) / 1000)}s — analyzed ${made}, failed ${failed}, skipped ${skipped} — est $${cost.toFixed(2)}`)
if (!DRY) await new Promise(r => setTimeout(r, 1200))
