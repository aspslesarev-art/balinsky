// Данные для отчёта по v2-разбору: распределения меток (ЖК / наши виллы / апарт / Airbnb / Booking)
// и «за что платит рынок» (цена к медиане слоя зона × тип × спальни). node scripts/vision-v2/report-data.mjs <out.json>
import fs from 'node:fs'
import { loadEnv } from '../_kb-build.mjs'
loadEnv()
const U = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1', K = process.env.SUPABASE_SERVICE_KEY, H = { apikey: K, Authorization: 'Bearer ' + K }
async function all(q) { const out = []; for (let o = 0; ; o += 1000) { const j = await (await fetch(`${U}/${q}&offset=${o}&limit=1000`, { headers: H })).json(); if (!Array.isArray(j)) throw new Error(q + ' ' + JSON.stringify(j).slice(0, 200)); out.push(...j); if (j.length < 1000) return out } }
const v2 = 'vision->>vocab=eq.v2'
const cat = await all(`catalog_product_vision?select=kind,airtable_id,vision&${v2}&order=airtable_id`)
const bk = await all(`booking_market_relative?select=id,zone,adr_ratio,stratum_n,vision&${v2}&order=id`)
const ab = await all(`airbnb_vision?select=id:id::text,vision&${v2}&order=id`)
// Airbnb: цена ночи и слой
const al = new Map((await all('airbnb_listings?select=id:id::text,zone,bedrooms,search_price,name&order=id')).map(r => [r.id, r]))
const night = s => { const m = /\$([\d,]+)\s*(?:for\s*(\d+)\s*night)?/i.exec(s || ''); return m ? +m[1].replace(/,/g, '') / (+m[2] || 1) : null }
const abRows = ab.map(r => { const l = al.get(r.id) || {}; return { id: r.id, zone: l.zone, key: `${l.zone}|${r.vision.visual_kind}|${Math.min(l.bedrooms ?? 1, 4)}`, price: night(l.search_price), vision: r.vision } })
const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null }
// медиана по слою — по ВСЕМ объектам Airbnb слоя с ценой, не только по v2
const allAb = await all('airbnb_vision?select=id:id::text,kind:vision->>visual_kind&order=id')
const strat = {}; for (const r of allAb) { const l = al.get(r.id); const p = night(l?.search_price); if (!l || !p) continue; (strat[`${l.zone}|${r.kind}|${Math.min(l.bedrooms ?? 1, 4)}`] ??= []).push(p) }
for (const r of abRows) { const s = strat[r.key]; r.ratio = s && s.length >= 8 && r.price ? r.price / med(s) : null }
const FIELDS = ['style_exterior', 'style_interior', 'style_primary', 'roof_type', 'palette', 'image_kind', 'build_stage', 'plot_density', 'privacy', 'greenery', 'shared_amenities', 'buyer_appeal', 'finish_tier', 'pool_type', 'facade_materials', 'views', 'materials', 'architecture']
const groups = { complex: cat.filter(r => r.kind === 'complex'), villa: cat.filter(r => r.kind === 'villa'), apartment: cat.filter(r => r.kind === 'apartment'), airbnb: abRows, booking: bk }
const dist = {}
for (const f of FIELDS) { dist[f] = {}; for (const [g, rows] of Object.entries(groups)) { const c = {}; for (const r of rows) { const v = r.vision[f]; for (const x of Array.isArray(v) ? v : [v]) if (x !== undefined && x !== null) c[x] = (c[x] || 0) + 1 } dist[f][g] = { n: rows.length, c } } }
// премия: медиана ratio по значению признака, n ≥ 30
const prem = {}
for (const f of FIELDS) { prem[f] = {}; for (const [g, rows, rk] of [['booking', bk, 'adr_ratio'], ['airbnb', abRows, 'ratio']]) { const by = {}; for (const r of rows) { const q = r[rk]; if (!Number.isFinite(q) || (g === 'booking' && r.stratum_n < 8)) continue; const v = r.vision[f]; for (const x of Array.isArray(v) ? v : [v]) if (x !== undefined) (by[x] ??= []).push(q) } prem[f][g] = Object.fromEntries(Object.entries(by).filter(([, a]) => a.length >= 30).map(([k, a]) => [k, { n: a.length, ratio: +med(a).toFixed(2) }])) } }
// ЖК для таблицы
const rc = new Map((await all('raw_complexes?select=airtable_id,data&order=airtable_id')).map(r => [r.airtable_id, r.data]))
const devs = new Map((await all('raw_developers?select=airtable_id,data&order=airtable_id')).map(r => [r.airtable_id, r.data?.Name ?? r.data?.['Название'] ?? '']))
const man = await (await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/complex-photos/_manifest.json')).json()
const list = groups.complex.map(r => { const d = rc.get(r.airtable_id) || {}; const dv = [].concat(d.Developer || d.Developer1 || [])[0]; return { id: r.airtable_id, name: d.Project || '', dev: devs.get(dv) || (typeof dv === 'string' && !dv.startsWith('rec') && !dv.startsWith('adm_') ? dv : ''), area: [].concat(d['Location 2'] || d.Location || [])[0] || '', slug: d['SEO:Slug'] || '', photo: (man[r.airtable_id] || [])[0] || '', v: r.vision } })
fs.writeFileSync(process.argv[2], JSON.stringify({ at: new Date().toISOString(), counts: Object.fromEntries(Object.entries(groups).map(([g, r]) => [g, r.length])), dist, prem, list }))
console.log(Object.fromEntries(Object.entries(groups).map(([g, r]) => [g, r.length])))
