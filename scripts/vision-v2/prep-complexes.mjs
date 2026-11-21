// v2-разбор фото ЖК (Claude по подписке). Шаг 1: скачать фото, сжать, разложить по пачкам.
// node scripts/vision-v2/prep-complexes.mjs <workdir> [--max=8] [--chunk=8]
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { loadEnv } from '../_kb-build.mjs'
import { pickPhotos, visionSystemPrompt, V2_FIELDS } from '../_product-vision.mjs'
loadEnv()
const WORK = process.argv[2]; if (!WORK) throw new Error('workdir?')
const arg = k => +(process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? NaN)
const MAX = arg('max') || 8, CHUNK = arg('chunk') || 8
const KIND = process.argv.find(a => a.startsWith('--kind='))?.split('=')[1] || 'complex'
const BUCKET = { complex: 'complex-photos', villa: 'villa-photos', apartment: 'apartment-photos' }[KIND]
const TABLE = { complex: 'raw_complexes', villa: 'raw_villas', apartment: 'raw_apartments' }[KIND]
const CTX = { complex: 'residential complex in Bali offered by a developer (photos are often renders)', villa: 'villa in Bali offered for sale (photos may be renders)', apartment: 'apartment in Bali offered for sale (photos may be renders)' }[KIND]
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_KEY
const H = { apikey: K, Authorization: 'Bearer ' + K }
const IMG = WORK + '/img/'; fs.mkdirSync(IMG, { recursive: true }); fs.mkdirSync(WORK + '/out', { recursive: true })
const man = await (await fetch(U + `/storage/v1/object/public/${BUCKET}/_manifest.json`)).json()
// названия ЖК для подсказки и отчёта
const names = {}
for (let o = 0; ; o += 1000) {
  const j = await (await fetch(`${U}/rest/v1/${TABLE}?select=airtable_id,data&offset=${o}&limit=1000`, { headers: H })).json()
  if (!Array.isArray(j)) throw new Error(JSON.stringify(j).slice(0, 200))
  for (const r of j) names[r.airtable_id] = r.data?.['Project'] ?? r.data?.['Name'] ?? r.data?.['Название'] ?? r.data?.name ?? ''
  if (j.length < 1000) break
}
const items = Object.entries(man).filter(([, v]) => v?.length).map(([id, urls]) => ({ id, name: names[id] || '', urls: pickPhotos(urls, MAX) }))
let k = 0; const jobs = items.flatMap(it => it.urls.map((u, i) => [it, u, `${IMG}${it.id.replace(/[^\w-]/g, '_')}_${i}.jpg`]))
await Promise.all(Array.from({ length: 16 }, async () => { while (k < jobs.length) { const [, u, f] = jobs[k++]; if (fs.existsSync(f)) continue; try { const r = await fetch(u); if (r.ok) { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); execFileSync('sips', ['-Z', '768', '-s', 'format', 'jpeg', f, '--out', f], { stdio: 'ignore' }) } } catch (e) { console.error('photo', u, String(e).slice(0, 80)) } } }))
const ok = f => fs.existsSync(f) && fs.statSync(f).size > 2000
const list = items.map(it => ({ id: it.id, name: it.name, files: jobs.filter(j => j[0] === it && ok(j[2])).map(j => j[2]) })).filter(x => x.files.length)
const booking = fs.readFileSync(process.env.HOME + '/booking-occupancy/vision_rubric.md', 'utf8')
const fields = booking.slice(booking.indexOf('Fields (all required):'))
fs.writeFileSync(WORK + '/rubric.md', visionSystemPrompt(CTX) + '\n\n' + fields.trim() + '\n' + V2_FIELDS + '\n')
let n = 0; for (let i = 0; i < list.length; i += CHUNK) fs.writeFileSync(`${WORK}/batch_${n++}.json`, JSON.stringify(list.slice(i, i + CHUNK)))
console.log('ЖК', list.length, 'фото', list.reduce((s, x) => s + x.files.length, 0), 'пачек', n)
