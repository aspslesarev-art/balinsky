#!/usr/bin/env node
// Балл востребованности юнита: 1..100.
//
// Читается буквально: «ожидаемо сильнее N% объектов, которые сдаются рядом в
// этом же сегменте». Считается так:
//   1. модель (scripts/demand-model-fit.mjs) переводит признаки продукта в
//      ожидаемый относительный RevPAR — сколько объект берёт сверх соседей и
//      насколько он заполнен относительно них;
//   2. тем же оценщиком считаются ВСЕ сдающиеся объекты страты «зона × тип ×
//      спальни» — иначе перцентиль сравнивал бы предсказание с фактом, а у
//      предсказания разброс заведомо меньше;
//   3. балл = место юнита среди них, слегка сдвинутое силой спроса самого
//      сегмента (см. SEGMENT_WEIGHT).
//
// Объяснение «почему» не сочиняется: разложение log(индекса) по признакам
// точно суммируется в отклонение от среднего по страте, поэтому в facts
// попадают ровно те слагаемые, которые и создали балл.
//
// Usage:
//   node scripts/demand-score.mjs --dry-run          # отчёт без записи
//   node scripts/demand-score.mjs --explain=5        # показать разбор 5 юнитов
//   node scripts/demand-score.mjs                    # посчитать и записать

import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_kb-build.mjs'
import {
  FEATURES, extractFeatures, toVector, calibrateFinish, unknownFeatures,
} from './_demand-features.mjs'

loadEnv()

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry-run')
const EXPLAIN = Number(argv.find(a => a.startsWith('--explain='))?.split('=')[1] ?? 0)

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const MODEL_VERSION = 1
const MIN_STRATUM = 8
const MIN_CONFIDENCE = 3
// Сколько сдающихся объектов должно быть в страте, чтобы перцентиль по ней
// что-то значил. Ниже порога — переходим на следующую ступень каскада.
const MIN_COMPS = 10
// Доля балла, которую отдаём силе спроса самого сегмента. Основа балла —
// место среди соседей, но без этой поправки юнит-лидер мёртвого сегмента
// выглядел бы звездой. 15% сдвигают, но не переписывают смысл.
const SEGMENT_WEIGHT = 0.15
// Ниже этой загрузки объект на Бали считаем простаивающим: рынок в среднем
// заполнен на 79%, и левый хвост — единственное место, где загрузка вообще
// различает объекты.
const IDLE_OCC = 70

const bedsBucket = b =>
  b == null ? 'n/a' : b <= 1 ? '0-1' : b === 2 ? '2' : b === 3 ? '3' : '4+'

const median = xs => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : null
}
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

async function pageAll(table, select, tweak = q => q) {
  const rows = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await tweak(sb.from(table).select(select)).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data.length) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

// ─── Модель ────────────────────────────────────────────────────────────────

const { data: modelRows, error: modelErr } = await sb
  .from('demand_model').select('*').eq('version', MODEL_VERSION)
if (modelErr) throw new Error(`demand_model: ${modelErr.message}`)
if (!modelRows?.length) throw new Error('модель не подогнана — сначала node scripts/demand-model-fit.mjs')

const asModel = target => {
  const row = modelRows.find(r => r.target === target)
  if (!row) throw new Error(`нет коэффициентов для мишени ${target}`)
  return { coef: FEATURES.map(f => Number(row.coef[f] ?? 0)), intercept: Number(row.intercept) }
}
const mAdr = asModel('adr')
const mOcc = asModel('occ')
const apply = (m, vec) => m.intercept + vec.reduce((s, v, j) => s + v * m.coef[j], 0)

// ─── Рынок: страты и опорный класс отделки ─────────────────────────────────

const marketRaw = await pageAll(
  'booking_market_relative',
  'id, title, zone, unit_kind, beds_bucket, adr, adr_ratio, occupancy, revpar_ratio, stratum_n, vision',
  q => q.gte('stratum_n', MIN_STRATUM),
)
const market = marketRaw.filter(
  r => Number(r.vision?.confidence) >= MIN_CONFIDENCE && Number.isFinite(Number(r.occupancy)),
)
console.log(`Рынок: ${market.length} сдающихся объектов с разбором фото`)

// Опорный класс для выравнивания отделки — только новые объекты рынка.
const referenceTiers = market
  .filter(r => r.vision?.condition === 'new')
  .map(r => Number(r.vision?.finish_tier))
  .filter(Number.isFinite)

const strata = new Map()
const push = (key, row) => {
  if (!strata.has(key)) strata.set(key, [])
  strata.get(key).push(row)
}
for (const r of market) {
  const kind = r.unit_kind ?? '?'
  push(`${r.zone}|${kind}|${r.beds_bucket}`, r)
  push(`${r.zone}|${kind}|*`, r)
  push(`*|${kind}|*`, r)
}

// Оценщик считается для КАЖДОГО объекта страты, а не только для юнита.
const stratumStats = new Map()
function statsFor(key) {
  if (stratumStats.has(key)) return stratumStats.get(key)
  const rows = strata.get(key)
  if (!rows?.length) return null
  const occAvg = mean(rows.map(r => Number(r.occupancy)))

  // Признак без улик не считается нулём: доля по страте берётся только по тем
  // объектам, где о нём вообще можно судить, и ею же замещается неизвестное.
  const raw = rows.map(r => ({
    row: r,
    vec: toVector(extractFeatures(r.vision)),
    unknown: unknownFeatures(r.vision),
  }))
  const featureShare = FEATURES.map((f, j) => {
    const known = raw.filter(e => !e.unknown.has(f)).map(e => e.vec[j])
    return known.length ? mean(known) : mean(raw.map(e => e.vec[j]))
  })
  const impute = (vec, unknown) =>
    vec.map((v, j) => (unknown.has(FEATURES[j]) ? featureShare[j] : v))

  const enriched = raw.map(e => {
    const vec = impute(e.vec, e.unknown)
    const adrMult = Math.exp(apply(mAdr, vec))
    const occPct = Math.min(100, Math.max(5, occAvg + apply(mOcc, vec) * 100))
    return { row: e.row, vec, index: adrMult * (occPct / occAvg) }
  })
  const stats = {
    key,
    n: rows.length,
    occAvg,
    indexSorted: enriched.map(e => e.index).sort((a, b) => a - b),
    featureShare,
    impute,
    medianAdr: median(rows.map(r => Number(r.adr)).filter(Number.isFinite)),
    medianOcc: median(rows.map(r => Number(r.occupancy))),
    idleShare: mean(rows.map(r => (Number(r.occupancy) < IDLE_OCC ? 1 : 0))),
  }
  stratumStats.set(key, stats)
  return stats
}

// Сила спроса сегмента: место его средней загрузки среди всех зон того же
// типа. Отвечает на «а сам сегмент в этом районе вообще живой?».
const segmentDemandPct = (kind, occAvg) => {
  const peers = [...strata.keys()]
    .filter(k => k.endsWith('|*') && k.split('|')[1] === kind && !k.startsWith('*'))
    .map(k => statsFor(k)?.occAvg)
    .filter(Number.isFinite)
  if (peers.length < 3) return 50
  return (100 * peers.filter(o => o < occAvg).length) / peers.length
}

// ─── Наши юниты ────────────────────────────────────────────────────────────

const kbRows = await pageAll('assistant_kb', 'kind, ref_id, slug, title, meta', q =>
  q.in('kind', ['villa', 'apartment']))
const geoRows = await pageAll('listing_geo', 'kind, airtable_id, lat, lng')
const visionRows = await pageAll('catalog_product_vision', 'kind, airtable_id, vision', q =>
  q.in('kind', ['villa', 'apartment']))
const zoneRows = await pageAll('catalog_product_zone', 'kind, airtable_id, zone')

const geoBy = new Map(geoRows.map(g => [`${g.kind}|${g.airtable_id}`, g]))
const visionBy = new Map(visionRows.map(v => [`${v.kind}|${v.airtable_id}`, v.vision]))
const zoneBy = new Map(zoneRows.map(z => [`${z.kind}|${z.airtable_id}`, z.zone]))

const units = kbRows
  .map(k => {
    const id = `${k.kind}|${k.ref_id}`
    const vision = visionBy.get(id)
    return {
      ...k,
      vision,
      geo: geoBy.get(id),
      zone: zoneBy.get(id),
      beds: k.meta?.bedrooms == null ? null : Number(k.meta.bedrooms),
      rawFinish: Number(vision?.finish_tier),
    }
  })
  .filter(u => u.vision && u.geo && u.zone)

console.log(`Каталог: ${units.length} юнитов с гео и разбором фото (из ${kbRows.length})`)

// Выравнивание отделки: порядок внутри каталога сохраняется, уровни
// переносятся на распределение новых объектов рынка.
const remapFinish = calibrateFinish(
  units.map(u => u.rawFinish).filter(Number.isFinite),
  referenceTiers,
)

// ─── Балл ──────────────────────────────────────────────────────────────────

const CASCADE_LABEL = { zone_beds: 'зона × тип × спальни', zone: 'зона × тип', island: 'весь остров' }

function scoreUnit(u) {
  const kind = u.kind === 'apartment' ? 'apartment' : 'villa'
  const bb = bedsBucket(u.beds)

  // Каскад: сужаем сравнение настолько, насколько хватает наблюдений.
  const candidates = [
    ['zone_beds', `${u.zone}|${kind}|${bb}`],
    ['zone', `${u.zone}|${kind}|*`],
    ['island', `*|${kind}|*`],
  ]
  let basis = null, st = null
  for (const [label, key] of candidates) {
    const s = statsFor(key)
    if (s && s.n >= MIN_COMPS) { basis = label; st = s; break }
  }
  if (!st) return null

  // Юнит проходит через тот же оценщик, что и его соседи.
  const feats = extractFeatures(u.vision)
  if (Number.isFinite(u.rawFinish)) {
    feats.finish_tier = (remapFinish(u.rawFinish) - 1) / 4
  }
  const unknown = unknownFeatures(u.vision)
  const vec = st.impute(toVector(feats), unknown)
  const adrMult = Math.exp(apply(mAdr, vec))
  const occPct = Math.min(100, Math.max(5, st.occAvg + apply(mOcc, vec) * 100))
  const index = adrMult * (occPct / st.occAvg)

  const below = st.indexSorted.filter(v => v < index).length
  const pctInStratum = (100 * below) / st.indexSorted.length
  const segPct = basis === 'island' ? 50 : segmentDemandPct(kind, st.occAvg)
  const score = Math.min(100, Math.max(1,
    Math.round((1 - SEGMENT_WEIGHT) * pctInStratum + SEGMENT_WEIGHT * segPct)))

  // Разложение: сумма вкладов = log(index) − среднее по страте, поэтому в
  // объяснение идут ровно те слагаемые, что и создали балл.
  const drivers = FEATURES.map((f, j) => {
    const delta = vec[j] - st.featureShare[j]
    return {
      feature: f,
      present: f === 'finish_tier' ? vec[j] >= 0.75 : vec[j] > 0.5,
      value: Number(vec[j].toFixed(2)),
      share_in_stratum: Number((100 * st.featureShare[j]).toFixed(0)),
      adr_effect_pct: Number((100 * (Math.exp(mAdr.coef[j] * delta) - 1)).toFixed(1)),
      occ_effect_pp: Number((mOcc.coef[j] * delta * 100).toFixed(1)),
    }
  })
    .filter(d => Math.abs(d.adr_effect_pct) >= 1 || Math.abs(d.occ_effect_pp) >= 1)
    .sort((a, b) =>
      Math.abs(b.adr_effect_pct) + Math.abs(b.occ_effect_pp) -
      (Math.abs(a.adr_effect_pct) + Math.abs(a.occ_effect_pp)))
    .slice(0, 6)

  return {
    kind: u.kind,
    airtable_id: u.ref_id,
    slug: u.slug ?? null,
    score,
    basis,
    zone: u.zone,
    beds_bucket: bb,
    comps_n: st.n,
    index_value: Number(index.toFixed(3)),
    pct_in_stratum: Number(pctInStratum.toFixed(1)),
    segment_demand_pct: Number(segPct.toFixed(1)),
    model_version: MODEL_VERSION,
    computed_at: new Date().toISOString(),
    facts: {
      title: u.title ?? null,
      district: u.meta?.district ?? null,
      bedrooms: u.beds,
      comparison: CASCADE_LABEL[basis],
      // Признаки, о которых подборка фото ничего не сказала: они замещены
      // средним по страте. Нужны, чтобы текст «почему» не утверждал лишнего.
      evidence_gaps: [...unknown],
      market: {
        median_adr_usd: st.medianAdr,
        median_occupancy_pct: st.medianOcc,
        mean_occupancy_pct: Number(st.occAvg.toFixed(1)),
        idle_share_pct: Number((100 * st.idleShare).toFixed(0)),
      },
      predicted: {
        adr_vs_neighbours: Number(adrMult.toFixed(2)),
        occupancy_pct: Number(occPct.toFixed(0)),
        expected_adr_usd: st.medianAdr ? Math.round(st.medianAdr * adrMult) : null,
      },
      drivers,
    },
  }
}

const scored = units.map(scoreUnit).filter(Boolean)
const skipped = units.length - scored.length
console.log(`Посчитано: ${scored.length} юнитов${skipped ? `, пропущено ${skipped} (нет сопоставимого рынка)` : ''}`)

const byBasis = scored.reduce((acc, s) => ({ ...acc, [s.basis]: (acc[s.basis] ?? 0) + 1 }), {})
console.log(`База сравнения: ${Object.entries(byBasis).map(([k, v]) => `${CASCADE_LABEL[k]} — ${v}`).join(' · ')}`)

const dist = [0, 20, 40, 60, 80].map(lo => ({
  lo, n: scored.filter(s => s.score > lo && s.score <= lo + 20).length,
}))
console.log('Распределение баллов: ' + dist.map(d => `${d.lo + 1}–${d.lo + 20}: ${d.n}`).join(' · '))

for (const s of scored.slice(0, EXPLAIN)) {
  console.log(`\n[${s.score}] ${s.facts.title ?? s.airtable_id} · ${s.zone} · ${s.comps_n} соседей (${s.facts.comparison})`)
  console.log(`   ставка к соседям ×${s.facts.predicted.adr_vs_neighbours}, загрузка ${s.facts.predicted.occupancy_pct}% при среднем ${s.facts.market.mean_occupancy_pct}%`)
  for (const d of s.facts.drivers.slice(0, 4)) {
    console.log(`   ${d.feature.padEnd(20)} у ${String(d.share_in_stratum).padStart(3)}% соседей · цена ${d.adr_effect_pct >= 0 ? '+' : ''}${d.adr_effect_pct}% · загрузка ${d.occ_effect_pp >= 0 ? '+' : ''}${d.occ_effect_pp} п.п.`)
  }
}

if (DRY) {
  console.log('\n--dry-run: ничего не записано')
  process.exit(0)
}

const payload = scored.map(({ slug, ...row }) => row)
for (let i = 0; i < payload.length; i += 200) {
  const { error } = await sb
    .from('unit_demand_score')
    .upsert(payload.slice(i, i + 200), { onConflict: 'kind,airtable_id' })
  if (error) throw new Error(`запись unit_demand_score: ${error.message}`)
}
console.log(`\nЗаписано ${payload.length} баллов`)
