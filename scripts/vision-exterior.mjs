// Labels every villa photo as exterior or interior, keyed BY URL.
//
// `_vision.json` already carries alt text, but its arrays are shorter than the
// albums and nothing ties an entry to a specific frame — filtering on index
// put bathrooms in the developer gallery. This pass writes
// villa-photos/_exterior.json as { url: 'ext' | 'int' }, so the mapping cannot
// drift.
//
// Scope: villas of complexes whose own album has fewer than five usable
// frames — those are the galleries that need filling. Resumable: URLs already
// labelled are skipped.
//
//   node scripts/vision-exterior.mjs [--dry] [--limit=N] [--all]
import fs from 'node:fs'
import { AzureOpenAI } from 'openai'

// dotenv isn't a dependency here; read .env.local the same way the other
// one-off scripts in this repo do.
for (const line of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const i = line.indexOf('=')
  if (i <= 0 || line.startsWith('#')) continue
  const k = line.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = line.slice(i + 1).trim()
}
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry')
const ALL = process.argv.includes('--all')
const LIMIT = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const BATCH = 8
const CONCURRENCY = 4
const NEED_PHOTOS = 5

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview',
})
const CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'

const SYS = `You label real-estate photos for a developer's public page.
For each image answer "ext" or "int".

"ext" — the shot reads as being outside: facade, the complex or block from
outside, aerial view, garden, pool seen from the yard, terrace open to the sky,
street, roof, entrance.
"int" — the shot reads as being inside a room: bedroom, bathroom, kitchen,
living room, hallway, closet, any interior even with a window view.

A covered terrace or balcony counts as "ext" only if the sky or the grounds
dominate the frame. When unsure answer "int" — a wrongly kept interior is worse
than a wrongly dropped exterior.

Reply with JSON: {"labels":["ext","int",...]} — exactly one entry per image, in
the order given.`

let cost = 0, made = 0, failed = 0
function track(pt, ct) {
  cost += (pt / 1e6) * 1.25 + (ct / 1e6) * 10
  if (DRY) return
  sb.from('balina_usage').insert({
    feature: 'other', deployment: CHAT, prompt_tokens: pt, completion_tokens: ct,
    audio_seconds: 0, cost_usd: (pt / 1e6) * 1.25 + (ct / 1e6) * 10,
    meta: { job: 'vision-exterior' },
  }).then(() => {}, () => {})
}

async function download(bucket, key) {
  const { data, error } = await sb.storage.from(bucket).download(key)
  if (error) return null
  try { return JSON.parse(await data.text()) } catch { return null }
}

async function label(urls) {
  const content = [{ type: 'text', text: `Label these ${urls.length} photos.` }]
  for (const u of urls) content.push({ type: 'image_url', image_url: { url: u, detail: 'low' } })
  const r = await ai.chat.completions.create({
    model: CHAT,
    messages: [{ role: 'system', content: SYS }, { role: 'user', content }],
    temperature: 0, max_completion_tokens: 300, response_format: { type: 'json_object' },
  })
  track(r.usage?.prompt_tokens ?? 0, r.usage?.completion_tokens ?? 0)
  const parsed = JSON.parse(r.choices[0].message.content)
  const labels = Array.isArray(parsed.labels) ? parsed.labels : []
  if (labels.length !== urls.length) throw new Error(`got ${labels.length} labels for ${urls.length} photos`)
  return labels.map(l => (String(l).toLowerCase().startsWith('ext') ? 'ext' : 'int'))
}

const norm = s => String(Array.isArray(s) ? s[0] : s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

async function main() {
  const [villaMan, complexMan, complexVision, existing] = await Promise.all([
    download('villa-photos', '_manifest.json'),
    download('complex-photos', '_manifest.json'),
    download('complex-photos', '_vision.json'),
    download('villa-photos', '_exterior.json'),
  ])
  if (!villaMan) throw new Error('no villa-photos/_manifest.json')
  const out = existing ?? {}

  const proj = f => encodeURIComponent(f)
  const rest = async p => {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${p}`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` },
    })
    return r.json()
  }
  const complexes = await rest(`raw_complexes?select=${proj('airtable_id,p:data->"Project"')}&limit=500`)
  const villas = await rest(`raw_villas?select=${proj('airtable_id,k:data->"Комплекс 1"')}&limit=3000`)

  const villasByComplex = new Map()
  for (const v of villas) {
    const k = norm(v.k)
    if (!k) continue
    if (!villasByComplex.has(k)) villasByComplex.set(k, [])
    villasByComplex.get(k).push(v.airtable_id)
  }

  const wanted = new Set()
  for (const c of complexes) {
    if (!ALL) {
      const rejected = new Set((complexVision?.[c.airtable_id]?.audit?.reject ?? []).map(r => r.i))
      const own = (complexMan?.[c.airtable_id] ?? []).filter((_, i) => !rejected.has(i))
      if (own.length >= NEED_PHOTOS) continue
    }
    for (const id of villasByComplex.get(norm(c.p)) ?? []) wanted.add(id)
  }

  const jobs = []
  for (const id of wanted) {
    const urls = (villaMan[id] ?? []).filter(u => !out[u])
    for (let i = 0; i < urls.length; i += BATCH) jobs.push(urls.slice(i, i + BATCH))
  }
  const work = LIMIT ? jobs.slice(0, LIMIT) : jobs
  const total = work.reduce((s, b) => s + b.length, 0)
  console.log(`вилл в выборке: ${wanted.size} | кадров к разметке: ${total} | запросов: ${work.length}`)
  if (DRY) return

  let idx = 0
  async function worker() {
    while (idx < work.length) {
      const batch = work[idx++]
      const n = idx
      try {
        const labels = await label(batch)
        batch.forEach((u, i) => { out[u] = labels[i] })
        made++
        if (n % 20 === 0 || n === work.length) {
          console.log(`  ${n}/${work.length} запросов, $${cost.toFixed(2)}`)
          await sb.storage.from('villa-photos').upload('_exterior.json', JSON.stringify(out), { contentType: 'application/json', upsert: true })
        }
      } catch (e) {
        failed++
        console.error(`  ошибка на батче ${n}: ${String(e.message).slice(0, 120)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  await sb.storage.from('villa-photos').upload('_exterior.json', JSON.stringify(out), { contentType: 'application/json', upsert: true })
  const ext = Object.values(out).filter(v => v === 'ext').length
  console.log(`\nготово: запросов ${made}, ошибок ${failed}, потрачено $${cost.toFixed(2)}`)
  console.log(`размечено кадров: ${Object.keys(out).length} | экстерьеров: ${ext} | интерьеров: ${Object.keys(out).length - ext}`)
}

main().catch(e => { console.error(e); process.exit(1) })
