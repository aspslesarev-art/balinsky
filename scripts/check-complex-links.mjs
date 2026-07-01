// TASK-13a coverage check: every news item and villa that belongs to a
// complex must point at that complex's card (news → canonical; villa →
// visible "part of complex" link). This resolves the parent complex the same
// way the pages do and reports coverage, so we can see the anti-cannibalization
// wiring actually fires. Run: node scripts/check-complex-links.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('/Users/andrei/balinsky/package.json')
const { createClient } = require('@supabase/supabase-js')
const e = fs.readFileSync('/Users/andrei/balinsky/.env.local', 'utf8')
for (const l of e.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const sb = createClient(SB, process.env.SUPABASE_SERVICE_KEY)

// Complex name → slug (mirrors lib/complex-index.ts)
const { data: cRows } = await sb.from('raw_complexes').select('slug, name:data->Project').limit(500)
const nameToSlug = new Map()
const complexNames = []
for (const r of cRows ?? []) {
  if (r.slug && r.name) { nameToSlug.set(String(r.name).trim().toLowerCase(), r.slug); complexNames.push(String(r.name)) }
}
console.log(`complexes: ${nameToSlug.size}`)

// Villa → parent complex (mirrors findParentComplex: longest complex name that
// is a substring of the villa title).
function str(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return str(v[0])
  if (typeof v === 'object' && 'value' in v) return str(v.value)
  return String(v)
}
function findParent(title) {
  const lower = str(title).toLowerCase()
  let best = null
  for (const n of complexNames) {
    const nl = n.toLowerCase()
    if (nl.length < 4) continue
    if (lower.includes(nl) && (!best || nl.length > best.length)) best = n
  }
  return best
}
const { data: vRows } = await sb.from('raw_villas').select(`ai:data->"ИИ Имя", seo:data->"SEO:Title"`).limit(3000)
let vTotal = 0, vLinked = 0
for (const r of vRows ?? []) {
  const title = r.ai || r.seo
  if (!title) continue
  vTotal++
  if (findParent(title)) vLinked++
}
console.log(`villas: ${vTotal} total · ${vLinked} resolve to a parent complex (${vTotal ? Math.round(vLinked / vTotal * 100) : 0}%) → show "part of complex" link`)

// News → complex (complexNames[0] → slug)
let nTotal = 0, nWithComplex = 0, nCanon = 0
try {
  const news = await fetch(`${SB}/storage/v1/object/public/news/_news.json`).then(r => r.json())
  const items = news.items || news || []
  for (const it of items) {
    nTotal++
    const cn = (it.complexNames || [])[0]
    if (cn) nWithComplex++
    // Mirror complexSlugForText: longest complex name as a substring of
    // title (+ complexNames[0]), length-guarded ≥5.
    const hay = [str(it.title), str(cn)].filter(Boolean).join(' ').toLowerCase()
    let hit = null
    for (const n of complexNames) { const nl = n.toLowerCase(); if (nl.length >= 5 && hay.includes(nl) && (!hit || nl.length > hit.length)) hit = nl }
    if (hit) nCanon++
  }
  console.log(`news: ${nTotal} total · ${nWithComplex} reference a complex · ${nCanon} canonical to a complex card (title-match)`)
} catch (err) {
  console.log('news manifest unavailable:', err.message)
}
console.log('\nOK — anti-cannibalization coverage reported.')
