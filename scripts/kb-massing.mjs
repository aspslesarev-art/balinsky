#!/usr/bin/env node
// Massing pass over complex photos (Azure gpt-5.4 multimodal): a SCHEMATIC
// volume description of the site — how many buildings, how many storeys, roof
// shape, pool and parking — so the map can extrude simple blocks.
//
// This is deliberately NOT a model of the real building: there are no
// footprints, no surveys and no floor plans in the data. Treat the output as
// infographics ("схема застройки"), never as a depiction of what is built —
// same rule as not retouching real-estate photos.
//
// Output → NEW Storage manifest: complex-photos/_massing.json
//   { [airtable_id]: { buildings[], pool, parking, density, site_layout,
//                      confidence, at } }
//
// Usage: --dry-run | --sample=N | --force | --conc=6 | --maxphotos=8

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
const MAXPHOTOS = val('maxphotos') ? parseInt(val('maxphotos'), 10) : 8
const CHECKPOINT = val('checkpoint') ? parseInt(val('checkpoint'), 10) : 25

const USD_IN_PER_M = 2.5
const USD_OUT_PER_M = 15

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({ apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT, apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview' })
const CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'
const BUCKET = 'complex-photos'

const SYS = `You are an architect producing a SCHEMATIC massing diagram of one Bali residential complex from its photos. You are NOT reconstructing the real building — you are describing its rough volume so it can be drawn as simple extruded blocks on a map.

Return STRICT JSON (no markdown):
{
  "buildings": [ { "storeys": <1-12>, "footprint_share": <0.05-1.0, share of the site footprint taken by this structure>, "roof": "flat" | "pitched" | "thatch" | "mixed", "form": "block" | "L" | "U" | "bar" | "villa" } ],
  "pool": { "present": true/false, "position": "center" | "front" | "rear" | "rooftop" | null },
  "parking": "surface" | "covered" | "underground" | "none",
  "density": "low" | "medium" | "high",
  "site_layout": "single" | "row" | "cluster" | "courtyard" | "tower",
  "confidence": <0.0-1.0>
}

Rules:
- Count DISTINCT structures visible across the photos, not the number of photos. A cluster of identical villas is several entries only if you can actually see them as separate buildings; otherwise use one entry and let the unit count carry the rest.
- storeys: count visible floors. Balinese villas are usually 1-2, apartment blocks 3-8. If unsure, use the most common value for that building type and lower the confidence.
- footprint_share values across all buildings should sum to roughly 1.0.
- confidence: 0.8+ only when the site layout is clearly visible (aerial or wide exterior shots). An interior-only photo set must return confidence below 0.4.
- Never invent a tower or underground parking you cannot see. When in doubt choose the simpler, lower option.`

let cost = 0, made = 0, failed = 0, skipped = 0, usageOff = false, consec = 0

function track(pt, ct) {
  const usd = (pt / 1e6) * USD_IN_PER_M + (ct / 1e6) * USD_OUT_PER_M
  cost += usd
  if (DRY || usageOff || pt + ct === 0) return
  sb.from('balina_usage').insert({ feature: 'other', deployment: CHAT, prompt_tokens: pt, completion_tokens: ct, audio_seconds: 0, cost_usd: usd, meta: { job: 'kb-massing' } })
    .then(({ error }) => { if (error && !usageOff) { usageOff = true; console.error('  (usage log off)') } })
}

const RETRIES = 3
const isTransient = msg => /timed out|timeout|429|500|502|503|504|ECONNRESET|fetch failed/i.test(msg ?? '')

async function analyze(urls, facts) {
  const content = [{ type: 'text', text: `Complex facts (use as constraints, do not contradict them):\n${facts}\n\nPhotos of this complex:` }]
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
      await new Promise(res => setTimeout(res, 1500 * attempt))
    }
  }
  throw lastError
}

const ROOFS = new Set(['flat', 'pitched', 'thatch', 'mixed'])
const FORMS = new Set(['block', 'L', 'U', 'bar', 'villa'])
const clamp = (n, lo, hi, dflt) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt)

function sanitize(j) {
  const raw = Array.isArray(j?.buildings) ? j.buildings.slice(0, 12) : []
  const buildings = raw.map(b => ({
    storeys: Math.round(clamp(Number(b?.storeys), 1, 12, 1)),
    footprint_share: clamp(Number(b?.footprint_share), 0.05, 1, 0.5),
    roof: ROOFS.has(b?.roof) ? b.roof : 'pitched',
    form: FORMS.has(b?.form) ? b.form : 'block',
  }))
  if (!buildings.length) buildings.push({ storeys: 1, footprint_share: 1, roof: 'pitched', form: 'villa' })
  // Normalise shares so the renderer can treat them as a partition of the site.
  const sum = buildings.reduce((a, b) => a + b.footprint_share, 0) || 1
  const normalised = buildings.map(b => ({ ...b, footprint_share: Math.round((b.footprint_share / sum) * 100) / 100 }))
  const present = j?.pool?.present === true
  return {
    buildings: normalised,
    pool: { present, position: present ? (j.pool.position ?? null) : null },
    parking: ['surface', 'covered', 'underground', 'none'].includes(j?.parking) ? j.parking : 'none',
    density: ['low', 'medium', 'high'].includes(j?.density) ? j.density : 'low',
    site_layout: ['single', 'row', 'cluster', 'courtyard', 'tower'].includes(j?.site_layout) ? j.site_layout : 'cluster',
    confidence: clamp(Number(j?.confidence), 0, 1, 0.3),
    at: new Date().toISOString().slice(0, 10),
  }
}

async function download(key) {
  const { data, error } = await sb.storage.from(BUCKET).download(key)
  if (error) return null
  try { return JSON.parse(await data.text()) } catch { return null }
}
async function upload(key, obj) {
  const { error } = await sb.storage.from(BUCKET).upload(key, JSON.stringify(obj), { contentType: 'application/json', upsert: true })
  if (error) console.error('  upload err', error.message)
  return !error
}

function factsOf(row, vision) {
  const d = row.data ?? {}
  const L = []
  const push = (label, v) => { if (v != null && v !== '') L.push(`${label}: ${v}`) }
  push('Project', d['Project'])
  push('Units total', d['Total quantity of units'])
  push('Unit types', Array.isArray(d['Типы юнитов']) ? d['Типы юнитов'].join(', ') : d['Типы юнитов'])
  push('Class', d['Class'])
  push('Status', d['Статус'])
  push('Land use', d['Назначение земли'])
  const f = vision?.features
  if (f?.pool) push('Pool seen in photos', f.pool_type ?? 'yes')
  if (f?.style) push('Style', f.style)
  return L.join('\n') || '(no facts)'
}

const photos = await download('_manifest.json')
if (!photos) { console.error('нет _manifest.json'); process.exit(1) }
const vision = (await download('_vision.json')) ?? {}
const existing = (await download('_massing.json')) ?? {}
const { data: rows, error } = await sb.from('raw_complexes').select('airtable_id, data')
if (error) { console.error('load err', error.message); process.exit(1) }

const byId = new Map(rows.map(r => [r.airtable_id, r]))
const ids = Object.keys(photos).filter(id => (photos[id]?.length ?? 0) > 0 && byId.has(id))
const todo = ids.filter(id => FORCE || SAMPLE || !existing[id])
skipped = ids.length - todo.length
const work = SAMPLE ? todo.slice(0, SAMPLE) : todo

console.log(`KB massing — Azure ${CHAT}${DRY ? ' [DRY]' : ''}${SAMPLE ? ` [SAMPLE ${SAMPLE}]` : ''} — ${ids.length} ЖК с фото, ${work.length} к обработке`)
const start = Date.now()
const results = new Map()
const merged = () => Object.fromEntries(
  [...new Set([...Object.keys(existing), ...results.keys()])].map(id => [id, results.get(id) ?? existing[id]]),
)

let idx = 0, aborted = false, sinceCheckpoint = 0
async function worker() {
  while (idx < work.length && !aborted) {
    const id = work[idx++]
    try {
      const j = await analyze(photos[id].slice(0, MAXPHOTOS), factsOf(byId.get(id), vision[id]))
      const m = sanitize(j)
      made++; consec = 0
      if (DRY) { console.log(`\n[${id}] ${byId.get(id).data?.['Project'] ?? ''}\n  ${JSON.stringify(m)}`); continue }
      results.set(id, m)
      if (++sinceCheckpoint >= CHECKPOINT) { sinceCheckpoint = 0; await upload('_massing.json', merged()) }
      process.stdout.write(`\r  ${made} готово, ${failed} упало — $${cost.toFixed(2)}   `)
    } catch (e) {
      failed++
      console.error('\n  err', id, e.message)
      if (++consec > 8) { aborted = true; console.error('!! ABORT') }
    }
  }
}
await Promise.all(Array.from({ length: Math.min(CONC, work.length || 1) }, worker))
if (!DRY && results.size > 0) {
  const ok = await upload('_massing.json', merged())
  console.log(`\n  ${ok ? 'записано' : 'ОШИБКА записи'} ${BUCKET}/_massing.json (+${results.size})`)
}
console.log(`\nDone in ${Math.round((Date.now() - start) / 1000)}s — ${made} готово, ${failed} упало, ${skipped} пропущено — $${cost.toFixed(2)}`)
if (!DRY) await new Promise(r => setTimeout(r, 1200))
