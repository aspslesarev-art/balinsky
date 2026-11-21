// v2-разбор рынка: выборка Airbnb + Booking (виллы/апартаменты целиком) по слоям «зона × спальни».
// Только новые поля v2 (старые у этих объектов уже есть). node scripts/vision-v2/prep-market.mjs <workdir> [--cap=20] [--chunk=10]
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { loadEnv } from '../_kb-build.mjs'
import { V2_FIELDS } from '../_product-vision.mjs'
loadEnv()
const WORK = process.argv[2]; const arg = k => +(process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? NaN)
const CAP = arg('cap') || 20, CHUNK = arg('chunk') || 10, PH = 5
const U = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1', K = process.env.SUPABASE_SERVICE_KEY, H = { apikey: K, Authorization: 'Bearer ' + K }
async function all(q) { const out = []; for (let o = 0; ; o += 1000) { const j = await (await fetch(`${U}/${q}&offset=${o}&limit=1000`, { headers: H })).json(); if (!Array.isArray(j)) throw new Error(q + ' ' + JSON.stringify(j).slice(0, 200)); out.push(...j); if (j.length < 1000) return out } }
const KINDS = new Set(['villa_private', 'villa_in_complex', 'apartment', 'house'])
const spread = (l, n) => l.length <= n ? l : [l[0], ...Array.from({ length: n - 1 }, (_, i) => l[Math.round((i + 1) * (l.length - 1) / (n - 1))])]
// детерминированная перетасовка, чтобы выборка не зависела от порядка в базе
const h = s => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) | 0; return x }
const items = []
// --skip=<workdir>: не брать объекты, уже попавшие в пачки другой выборки
const SKIP = new Set(); const sk = process.argv.find(a => a.startsWith('--skip='))?.slice(7)
if (sk) for (const f of fs.readdirSync(sk).filter(f => /^batch_\d+\.json$/.test(f))) for (const x of JSON.parse(fs.readFileSync(sk + '/' + f, 'utf8'))) SKIP.add(x.id)
// по слоям «по кругу»: если ночь кончится раньше, разобранное всё равно ровно покрывает рынок
const roundRobin = groups => { const ls = groups.map(l => l.sort((a, b) => h(a.id) - h(b.id)).filter(x => !SKIP.has(`${x.src}:${x.id}`)).slice(0, CAP)); const out = []; for (let i = 0; ls.some(l => i < l.length); i++) for (const l of ls) if (i < l.length) out.push(l[i]); return out }
// Airbnb
const av = await all('airbnb_vision?select=id:id::text,kind:vision->>visual_kind,photos&order=id')
const al = new Map((await all('airbnb_listings?select=id:id::text,zone,bedrooms&n_photos=gt.0&order=id')).map(r => [r.id, r]))
const strata = {}
for (const r of av) { const l = al.get(r.id); if (!l || !KINDS.has(r.kind) || !r.photos?.length) continue; const key = `${l.zone}|${Math.min(l.bedrooms ?? 1, 4)}`; (strata[key] ??= []).push({ src: 'airbnb', id: r.id, urls: spread(r.photos, PH) }) }
items.push(...roundRobin(Object.values(strata)))
// Booking
const bm = await all('booking_market_relative?select=id,zone,bedrooms,kind:vision->>visual_kind&stratum_n=gte.8&order=id')
const bi = new Map((await all('booking_data_cards?select=id,images&order=id')).map(r => [r.id, r.images]))
const bs = {}
for (const r of bm) { if (!KINDS.has(r.kind)) continue; let im = bi.get(r.id); try { im = typeof im === 'string' ? JSON.parse(im) : im } catch { im = null } if (!Array.isArray(im) || im.length < 3) continue; const key = `${r.zone}|${Math.min(+r.bedrooms || 1, 4)}`; (bs[key] ??= []).push({ src: 'booking', id: String(r.id), urls: spread(im.filter(u => typeof u === 'string'), PH) }) }
{ const b = roundRobin(Object.values(bs)); const a = items.splice(0); for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) items.push(a[i]); if (b[i]) items.push(b[i]) } }
console.log('airbnb', items.filter(i => i.src === 'airbnb').length, 'booking', items.filter(i => i.src === 'booking').length, 'слоёв', Object.keys(strata).length, Object.keys(bs).length)
if (process.argv.includes('--dry')) process.exit(0)
const IMG = WORK + '/img/'; fs.mkdirSync(IMG, { recursive: true }); fs.mkdirSync(WORK + '/out', { recursive: true })
const jobs = items.flatMap(it => it.urls.map((u, i) => [it, u.replace(/im_w=\d+/, 'im_w=720'), `${IMG}${it.src}_${it.id}_${i}.jpg`]))
let k = 0
await Promise.all(Array.from({ length: 16 }, async () => { while (k < jobs.length) { const [, u, f] = jobs[k++]; if (fs.existsSync(f)) continue; try { const r = await fetch(u); if (r.ok) { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); execFileSync('sips', ['-Z', '640', '-s', 'format', 'jpeg', f, '--out', f], { stdio: 'ignore' }) } } catch {} } }))
const ok = f => fs.existsSync(f) && fs.statSync(f).size > 2000
const list = items.map(it => ({ id: `${it.src}:${it.id}`, files: jobs.filter(j => j[0] === it && ok(j[2])).map(j => j[2]) })).filter(x => x.files.length >= 2)
fs.writeFileSync(WORK + '/rubric.md', `You are a hospitality real-estate product analyst. You get several photos of ONE short-term rental listing in Bali (villa or apartment).
Judge the PRODUCT: what is physically there. Use ONLY what is visible; if not shown use 0 / "none" / "not_shown" / empty array. Never infer from the vibe.
Return JSON only. Fields (all required):
${V2_FIELDS}
`)
let n = 0; for (let i = 0; i < list.length; i += CHUNK) fs.writeFileSync(`${WORK}/batch_${n++}.json`, JSON.stringify(list.slice(i, i + CHUNK)))
console.log('объектов', list.length, 'пачек', n)
