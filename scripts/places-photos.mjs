// Pulls photos for complexes from their Google Places listing and keeps the
// exterior ones, for galleries that our own albums can't fill.
//
// Two guards, both learned the hard way:
//  - a place is accepted only within 300 m with overlapping name words, or
//    within 800 m on a full name match. Without this Google happily returns a
//    neighbour: «Renaissanse Residence» matched a museum 1.9 km away.
//  - every photo is labelled ext/int by the same vision prompt as
//    scripts/vision-exterior.mjs, keyed by the URL it will be served under.
//
//   node scripts/places-photos.mjs [--dry] [--limit=N] [--all]
import fs from 'node:fs'
import { AzureOpenAI } from 'openai'
import { createClient } from '@supabase/supabase-js'

for (const line of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const i = line.indexOf('=')
  if (i <= 0 || line.startsWith('#')) continue
  const k = line.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = line.slice(i + 1).trim()
}

const DRY = process.argv.includes('--dry')
const ALL = process.argv.includes('--all')
const LIMIT = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)

const SITE = 'https://balinsky.info'
const MAX_PHOTOS = 8
const NEED_PHOTOS = 5
const NEAR_M = 300
const EXACT_M = 800
const BATCH = 8

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const KEY = process.env.GOOGLE_PLACES_KEY
const ai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview',
})
const CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'

const SYS = `You label real-estate photos for a developer's public page.
For each image answer "ext" or "int".
"ext" — outside: facade, the complex from outside, aerial view, garden, pool in
the yard, terrace open to the sky, street, entrance.
"int" — inside a room: bedroom, bathroom, kitchen, living room, hallway, any
interior even with a window view. Also answer "int" for menus, logos, documents,
staff portraits and other shots that are not the property itself.
When unsure answer "int".
Reply JSON: {"labels":["ext","int",...]} — one entry per image, in order.`

const norm = s => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
const words = s => norm(s).replace(/[^a-zа-я0-9 ]/gi, ' ').split(/\s+/)
  .filter(w => w.length > 2 && !['the', 'villa', 'villas', 'bali', 'by', 'complex', 'apartments', 'resort'].includes(w))
const rad = d => d * Math.PI / 180
function distM(a, b, c, d) {
  const R = 6371000
  const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

async function rest(p) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${p}`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` },
  })
  return r.json()
}
async function download(bucket, key) {
  const { data, error } = await sb.storage.from(bucket).download(key)
  if (error) return null
  try { return JSON.parse(await data.text()) } catch { return null }
}

let cost = 0
async function labelPhotos(urls) {
  const content = [{ type: 'text', text: `Label these ${urls.length} photos.` }]
  for (const u of urls) content.push({ type: 'image_url', image_url: { url: u, detail: 'low' } })
  const r = await ai.chat.completions.create({
    model: CHAT, messages: [{ role: 'system', content: SYS }, { role: 'user', content }],
    temperature: 0, max_completion_tokens: 300, response_format: { type: 'json_object' },
  })
  const pt = r.usage?.prompt_tokens ?? 0, ct = r.usage?.completion_tokens ?? 0
  cost += (pt / 1e6) * 1.25 + (ct / 1e6) * 10
  const parsed = JSON.parse(r.choices[0].message.content)
  const labels = Array.isArray(parsed.labels) ? parsed.labels : []
  if (labels.length !== urls.length) throw new Error(`${labels.length} labels for ${urls.length} photos`)
  return labels.map(l => (String(l).toLowerCase().startsWith('ext') ? 'ext' : 'int'))
}

async function main() {
  const [complexMan, complexVision, villaMan, villaExt, previous] = await Promise.all([
    download('complex-photos', '_manifest.json'),
    download('complex-photos', '_vision.json'),
    download('villa-photos', '_manifest.json'),
    download('villa-photos', '_exterior.json'),
    download('complex-photos', '_places.json'),
  ])
  const out = previous?.items ?? {}

  const F = ['Project', 'Location 2', 'Geo', 'Geo 2']
  const sel = ['airtable_id', ...F.map((k, i) => `f${i}:data->"${k}"`)].join(',')
  const complexes = (await rest(`raw_complexes?select=${encodeURIComponent(sel)}&limit=500`))
    .map(r => { const o = { id: r.airtable_id }; F.forEach((k, i) => { o[k] = r[`f${i}`] }); return o })
  const villas = await rest(`raw_villas?select=${encodeURIComponent('airtable_id,k:data->"Комплекс 1"')}&limit=3000`)

  const byComplex = new Map()
  for (const v of villas) {
    const k = norm(Array.isArray(v.k) ? v.k[0] : v.k)
    if (!k) continue
    if (!byComplex.has(k)) byComplex.set(k, [])
    byComplex.get(k).push(v.airtable_id)
  }

  const need = complexes.filter(c => {
    if (ALL) return true
    const rejected = new Set((complexVision?.[c.id]?.audit?.reject ?? []).map(r => r.i))
    const own = (complexMan?.[c.id] ?? []).filter((_, i) => !rejected.has(i))
    const add = (byComplex.get(norm(Array.isArray(c.Project) ? c.Project[0] : c.Project)) ?? [])
      .flatMap(id => (villaMan?.[id] ?? []).filter(u => villaExt?.[u] === 'ext'))
    return new Set([...own, ...add]).size < NEED_PHOTOS
  })
  const work = LIMIT ? need.slice(0, LIMIT) : need
  console.log(`комплексов без ${NEED_PHOTOS} кадров: ${need.length} | обрабатываем: ${work.length}`)
  if (DRY) return

  let matched = 0, rejectedMatch = 0, kept = 0, seen = 0
  for (const c of work) {
    const name = String(Array.isArray(c.Project) ? c.Project[0] : c.Project ?? '')
    const body = { textQuery: `${name} ${c['Location 2'] ?? ''} Bali`, maxResultCount: 5 }
    const lat = Number(c.Geo), lng = Number(c['Geo 2'])
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng)
    if (hasGeo) body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 3000 } }

    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.photos',
      },
      body: JSON.stringify(body),
    })
    if (!r.ok) { console.error(`  x ${name}: HTTP ${r.status}`); continue }
    const places = ((await r.json()).places ?? []).map(p => ({
      ...p,
      d: hasGeo && p.location ? distM(lat, lng, p.location.latitude, p.location.longitude) : null,
    }))

    const a = new Set(words(name))
    const hit = places.find(p => {
      if (!p.photos?.length || p.d == null) return false
      const b = words(p.displayName?.text)
      const overlap = b.filter(w => a.has(w)).length
      const strong = overlap > 0 && overlap >= Math.min(a.size, b.length) * 0.5
      const exact = a.size > 0 && overlap >= a.size
      return (p.d <= NEAR_M && strong) || (p.d <= EXACT_M && exact)
    })
    if (!hit) { rejectedMatch++; continue }
    matched++

    const photos = hit.photos.slice(0, MAX_PHOTOS).map(p => ({
      name: p.name,
      attribution: (p.authorAttributions ?? []).map(x => x.displayName).join(', ') || null,
    }))
    // Azure's image fetcher can't read our proxy, so ask Google for the direct
    // media URL just for labelling. The site still serves through the proxy —
    // these direct links expire.
    const urls = []
    for (const p of photos) {
      try {
        const m = await fetch(`https://places.googleapis.com/v1/${p.name}/media`
          + `?maxHeightPx=800&skipHttpRedirect=true&key=${encodeURIComponent(KEY)}`)
        const j = m.ok ? await m.json() : null
        urls.push(j?.photoUri ?? null)
      } catch { urls.push(null) }
    }
    const labelable = urls.filter(Boolean)
    if (!labelable.length) { console.error(`  нет прямых ссылок: ${name}`); continue }
    const byUrl = new Map()
    for (let i = 0; i < labelable.length; i += BATCH) {
      const chunk = labelable.slice(i, i + BATCH)
      try {
        const got = await labelPhotos(chunk)
        chunk.forEach((u, j) => byUrl.set(u, got[j]))
      } catch (e) {
        console.error(`  разметка ${name}: ${String(e.message).slice(0, 80)}`)
        chunk.forEach(u => byUrl.set(u, 'int'))
      }
    }
    const labels = urls.map(u => (u ? byUrl.get(u) ?? 'int' : 'int'))
    seen += photos.length
    const exteriors = photos.filter((_, i) => labels[i] === 'ext')
    kept += exteriors.length
    out[c.id] = {
      placeId: hit.id, placeName: hit.displayName?.text ?? null,
      distanceM: Math.round(hit.d), photos: exteriors,
    }
    console.log(`  ${name} → «${hit.displayName?.text}» ${Math.round(hit.d)} м | ${exteriors.length}/${photos.length} экстерьеров`)
  }

  const payload = { generatedAt: new Date().toISOString().slice(0, 10), count: Object.keys(out).length, items: out }
  await sb.storage.from('complex-photos').upload('_places.json', JSON.stringify(payload), { contentType: 'application/json', upsert: true })
  console.log(`\nсовпало ${matched}, отклонено по совпадению ${rejectedMatch}`)
  console.log(`кадров просмотрено ${seen}, экстерьеров оставлено ${kept}, Azure $${cost.toFixed(2)}`)
}

main().catch(e => { console.error(e); process.exit(1) })
