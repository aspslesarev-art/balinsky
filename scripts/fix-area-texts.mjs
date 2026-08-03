// Backfill for listings whose copy still quotes an old metreage.
//
// `lib/admin/area-sync.ts` keeps title/description/social/aggregator text in
// step with `Площадь` from now on, but rows edited before that guard existed
// are still stale — e.g. the Urban Escape villas titled "254 м²" while the
// record says 314. This finds every raw_villas / raw_apartments row where the
// number in `SEO:Title` disagrees with `Площадь` and rewrites the metreage
// everywhere it appears in that row's text.
//
// `SEO:Slug` is left alone on purpose: it is the public URL, and rewriting it
// would break inbound links and force a re-index.
//
// Usage:
//   node scripts/fix-area-texts.mjs            # dry run, prints the diff
//   node scripts/fix-area-texts.mjs --apply    # writes to Supabase
//
// Keep the unit list and skip list in sync with lib/admin/area-sync.ts.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const APPLY = process.argv.includes('--apply')
const TABLES = ['raw_villas', 'raw_apartments']
const AREA_FIELD = 'Площадь'
const TITLE_FIELD = 'SEO:Title'
const PRICE_PER_SQM_FIELD = 'Цена м²'
const PRICE_FIELDS = ['price', 'price_usd']
const SKIP_FIELDS = new Set(['SEO:Slug', 'Slug', 'PDF code', 'photos', 'Renders', 'Post ID', 'external_id'])
const DERIVED_PRICE_TOLERANCE = 0.02
/** Rounding slack so 103 vs 103.0 is not reported as a mismatch. */
const AREA_EPSILON = 0.6

function loadEnv() {
  const raw = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const out = {}
  for (const line of raw.split('\n')) {
    if (!line.includes('=') || line.trimStart().startsWith('#')) continue
    const i = line.indexOf('=')
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

function numberOrNull(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').replace(/[^\d.]/g, ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }
  if (Array.isArray(v)) return numberOrNull(v[0])
  if (v && typeof v === 'object' && 'value' in v) return numberOrNull(v.value)
  return null
}

function plainString(v) {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return plainString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return plainString(v.value)
  return null
}

function areaPattern(area) {
  const digits = String(area).replace('.', '[.,]')
  return new RegExp(`(?<![\\d.,])${digits}(\\s*)(м²|m²|м2|m2|sqm|кв\\.?\\s?м)`, 'gi')
}

// A listing's land plot uses the same unit and sometimes equals the old built
// area (BINGIN ELEMENTS: 220 м² land, 220 м² built) — never rewrite those.
const LAND_CONTEXT = /(земл|участ|land|plot)/i
const LAND_LOOKBACK = 45

function rewriteValue(v, pattern, nextArea) {
  if (typeof v === 'string') {
    const next = v.replace(pattern, (match, gap, unit, offset) =>
      LAND_CONTEXT.test(v.slice(Math.max(0, offset - LAND_LOOKBACK), offset))
        ? match
        : `${nextArea}${gap}${unit}`)
    return next === v ? null : next
  }
  if (Array.isArray(v)) {
    const items = v.map(item => rewriteValue(item, pattern, nextArea) ?? item)
    return items.some((item, i) => item !== v[i]) ? items : null
  }
  if (v && typeof v === 'object' && 'value' in v) {
    const next = rewriteValue(v.value, pattern, nextArea)
    return next === null ? null : { ...v, value: next }
  }
  return null
}

/** Metreage quoted in the row's title, or null when it quotes none. */
function titleArea(data) {
  const title = plainString(data[TITLE_FIELD])
  if (!title) return null
  const m = title.match(/(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(?:м²|m²|м2|m2)/i)
  return m ? Number(m[1].replace(',', '.')) : null
}

function pricePerSqmPatch(data, prevArea, nextArea) {
  const price = PRICE_FIELDS.map(k => numberOrNull(data[k])).find(n => n !== null)
  const stored = numberOrNull(data[PRICE_PER_SQM_FIELD])
  if (price == null || stored == null) return {}
  const derived = price / prevArea
  if (Math.abs(stored - derived) / derived > DERIVED_PRICE_TOLERANCE) return {}
  return { [PRICE_PER_SQM_FIELD]: price / nextArea }
}

/** raw_* table → the revalidate kind whose caches hold its rows. */
const TABLE_KIND = { raw_villas: 'villas', raw_apartments: 'apartments' }

/**
 * A direct Supabase write bypasses lib/admin/revalidate.ts, so the module-level
 * catalog caches and the ISR tags would keep serving the old titles. Bump
 * content_version (the only signal those in-process caches watch) and, when a
 * token is configured, ask the live site to drop its tags and paths too.
 */
async function refreshSite(sb, env, kinds) {
  for (const kind of kinds) {
    const { error } = await sb.rpc('bump_content_version', { p_kind: kind })
    if (error) console.error(`bump ${kind}:`, error.message)
  }
  const token = env.REVALIDATE_TOKEN
  const base = env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
  if (!token) {
    console.log('REVALIDATE_TOKEN не задан — теги ISR не сброшены, обновятся по TTL.')
    return
  }
  const res = await fetch(`${base}/api/revalidate-content?kinds=${[...kinds].join(',')}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })
  console.log(`revalidate-content: ${res.status} ${await res.text()}`)
}

const env = loadEnv()
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

let totalRows = 0
let totalFields = 0
const touchedKinds = new Set()

for (const table of TABLES) {
  const { data: rows, error } = await sb.from(table).select('airtable_id, data')
  if (error) throw new Error(`${table}: ${error.message}`)

  for (const row of rows ?? []) {
    const data = row.data ?? {}
    const actual = numberOrNull(data[AREA_FIELD])
    const quoted = titleArea(data)
    if (actual == null || quoted == null || Math.abs(actual - quoted) <= AREA_EPSILON) continue

    const pattern = areaPattern(quoted)
    const patch = {}
    for (const [key, value] of Object.entries(data)) {
      if (SKIP_FIELDS.has(key)) continue
      const next = rewriteValue(value, pattern, actual)
      if (next !== null) patch[key] = next
    }
    Object.assign(patch, pricePerSqmPatch(data, quoted, actual))
    if (Object.keys(patch).length === 0) continue

    totalRows++
    totalFields += Object.keys(patch).length
    console.log(`\n${table} ${row.airtable_id}: ${quoted} → ${actual} м² (${Object.keys(patch).length} полей)`)
    console.log(`  ${TITLE_FIELD}: ${plainString(patch[TITLE_FIELD]) ?? '—'}`)

    if (APPLY) {
      const { error: writeErr } = await sb
        .from(table)
        .update({ data: { ...data, ...patch }, synced_at: new Date().toISOString() })
        .eq('airtable_id', row.airtable_id)
      if (writeErr) throw new Error(`${table} ${row.airtable_id}: ${writeErr.message}`)
      touchedKinds.add(TABLE_KIND[table])
    }
  }
}

console.log(`\n${APPLY ? 'Записано' : 'Найдено (dry run)'}: ${totalRows} записей, ${totalFields} полей`)
if (!APPLY) console.log('Запусти с --apply, чтобы применить.')
if (APPLY && touchedKinds.size > 0) await refreshSite(sb, env, touchedKinds)
