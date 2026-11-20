// Балл востребованности юнита в своём районе (1..100) для страниц каталога.
//
// Считается вне сайта (scripts/demand-score.mjs + demand-explain.mjs) и здесь
// только читается: на странице ЖК таких юнитов до дюжины, и считать по каждому
// перцентиль среди 12 тысяч сдающихся объектов на рендере невозможно.
//
// Что означает число: объект ожидаемо сильнее N% объектов, которые сдаются
// рядом в том же типе и размере. Не доходность и не оценка застройщика.

import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { BOOKING_FIELD, applyMarks, readMarks } from '@/lib/booking-amenities'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type UnitKind = 'villa' | 'apartment'

/** Насколько узкой была группа сравнения — от неё зависит формулировка. */
export type DemandBasis = 'zone_beds' | 'zone' | 'island'

export type DemandDriver = {
  feature: string
  present: boolean
  share_in_stratum: number
  adr_effect_pct: number
  occ_effect_pp: number
}

/** Данные для пересчёта балла на лету (scripts/demand-score.mjs → facts.live). */
type Live = {
  base: Record<string, number>
  q: number[]
  occ_avg: number
  seg_pct: number
  seg_weight: number
  median_adr_usd: number | null
}

export type UnitDemand = {
  kind: UnitKind
  airtableId: string
  score: number
  basis: DemandBasis
  zone: string
  compsN: number
  /** Ожидаемая ставка к соседям, ×1.0 = вровень. */
  adrVsNeighbours: number | null
  expectedAdrUsd: number | null
  /** Средняя загрузка сегмента в этой зоне, %. */
  segmentOccupancyPct: number | null
  /** Доля объектов сегмента с загрузкой ниже 70%. */
  segmentIdlePct: number | null
  drivers: DemandDriver[]
  live: Live | null
  why: string | null
}

// Границы взяты по смыслу перцентиля, а не по красоте: 50 — ровно медиана
// предложения района, поэтому «сильный» начинается заметно выше неё, а
// «слабый» — заметно ниже.
export const DEMAND_STRONG = 70
export const DEMAND_WEAK = 45

// Группа сравнения меньше 10 объектов ни о чём не говорит; такие строки скрипт
// и не пишет, но проверка дешёвая, а тихо показанный балл по трём соседям —
// дорогая ошибка.
const MIN_TRUSTWORTHY_COMPS = 10

type Row = {
  kind: UnitKind
  airtable_id: string
  score: number
  basis: DemandBasis
  zone: string
  comps_n: number
  facts: {
    predicted?: { adr_vs_neighbours?: number; expected_adr_usd?: number | null }
    market?: { mean_occupancy_pct?: number; idle_share_pct?: number }
    drivers?: DemandDriver[]
    live?: Live
  } | null
  why_ru: string | null
  why_en: string | null
}

// unit_demand_score.zone is stored in Russian; every other locale gets the
// Latin name (these are place names, the same in all Latin-script languages).
const ZONE_LATIN: Record<string, string> = {
  'Унгасан — Меласти': 'Ungasan — Melasti',
  'Сесех — Чемаги': 'Seseh — Cemagi',
  'Убуд': 'Ubud',
  'Нуса-Дуа': 'Nusa Dua',
  'Переренан': 'Pererenan',
  'Падонан — Тумбак-Баю': 'Padonan — Tumbak Bayuh',
  'Джимбаран': 'Jimbaran',
  'Чангу — Бату-Болонг': 'Canggu — Batu Bolong',
  'Берава': 'Berawa',
  'Бингин — Паданг-Паданг': 'Bingin — Padang Padang',
  'Умалас': 'Umalas',
  'Улувату — Пекату': 'Uluwatu — Pecatu',
  'Санур': 'Sanur',
  'Сануp': 'Sanur',
  'Нуса-Пенида — Лембонган': 'Nusa Penida — Lembongan',
  'Кедунгу — Табанан': 'Kedungu — Tabanan',
  'Семиньяк': 'Seminyak',
  'Чандидаса — Карангасем': 'Candidasa — Karangasem',
  'Прочее': 'other areas',
  'Тегаллаланг — Паянган': 'Tegallalang — Payangan',
  'Керобокан': 'Kerobokan',
}

// В старых пояснениях (до 16.10.2026) есть загрузка с витрины Booking —
// «ожидается загрузка 93%». Она считает закрытые календари занятыми и
// противоречит загрузке калькулятора на той же странице. Такие предложения
// выкидываем при показе; новые тексты scripts/demand-explain.mjs пишет без неё.
const OCC_SENTENCE = /(загрузк|заполняем|простаива|заняты на|occupan|sit below|fall below)/i
function withoutOccupancy(text: string | null): string | null {
  if (!text) return null
  const kept = text.split(/(?<=[.!?])\s+/).filter(s => !(OCC_SENTENCE.test(s) && /\d\s?%/.test(s)))
  return kept.length ? kept.join(' ') : null
}

function toDemand(row: Row, lang: string): UnitDemand | null {
  if (row.comps_n < MIN_TRUSTWORTHY_COMPS) return null
  const f = row.facts ?? {}
  return {
    kind: row.kind,
    airtableId: row.airtable_id,
    score: row.score,
    basis: row.basis,
    // В данных Санур записан с латинской «p» («Сануp») — по-русски показываем правильно.
    zone: lang === 'ru' ? row.zone.replace('Сануp', 'Санур') : (ZONE_LATIN[row.zone] ?? row.zone),
    compsN: row.comps_n,
    adrVsNeighbours: f.predicted?.adr_vs_neighbours ?? null,
    expectedAdrUsd: f.predicted?.expected_adr_usd ?? null,
    segmentOccupancyPct: f.market?.mean_occupancy_pct ?? null,
    segmentIdlePct: f.market?.idle_share_pct ?? null,
    drivers: f.drivers ?? [],
    // Пояснение живёт на двух языках; остальные локали получают английское,
    // а не машинный перевод на лету — он тут дороже пользы.
    live: f.live ?? null,
    why: withoutOccupancy((lang === 'ru' ? row.why_ru : row.why_en) ?? row.why_en ?? null),
  }
}

const SELECT = 'kind, airtable_id, score, basis, zone, comps_n, facts, why_ru, why_en'

/** Баллы пачкой — для списка юнитов на странице ЖК. */
export const loadUnitDemand = unstable_cache(
  async (ids: Array<{ kind: UnitKind; airtableId: string }>, lang: string) => {
    if (ids.length === 0) return {} as Record<string, UnitDemand>
    const { data, error } = await sb
      .from('unit_demand_score')
      .select(SELECT)
      .in('airtable_id', ids.map(i => i.airtableId))
    if (error || !data) return {} as Record<string, UnitDemand>

    // Ключ составной: airtable_id уникален внутри вида, но не между ними.
    const wanted = new Set(ids.map(i => `${i.kind}|${i.airtableId}`))
    const out: Record<string, UnitDemand> = {}
    for (const row of data as Row[]) {
      const key = `${row.kind}|${row.airtable_id}`
      if (!wanted.has(key)) continue
      const demand = toDemand(row, lang)
      if (demand) out[key] = demand
    }
    return out
  },
  ['unit-demand-batch'],
  { revalidate: 604800, tags: ['unit-demand'] },
)

const loadDemandModel = unstable_cache(async () => {
  const { data, error } = await sb.from('demand_model').select('target, coef, intercept').eq('version', 1)
  if (error) throw new Error(`demand_model: ${error.message}`)
  const pick = (t: string) => {
    const r = data?.find(m => m.target === t)
    return r ? { coef: r.coef as Record<string, number>, intercept: Number(r.intercept) } : null
  }
  return { adr: pick('adr'), occ: pick('occ') }
}, ['unit-demand-model-v1'], { revalidate: 86400 })

const TABLE: Record<UnitKind, string> = { villa: 'raw_villas', apartment: 'raw_apartments' }

/**
 * Отметки «Редактировать → Для Booking» меняют балл сразу, без ночного
 * пересчёта: тот же оценщик, что в scripts/demand-score.mjs, применяется к
 * вектору «только по фото» с текущими отметками, место — по распределению
 * соседей, которое скрипт сохранил.
 */
async function withLiveMarks(d: UnitDemand): Promise<UnitDemand> {
  const live = d.live
  if (!live?.base || !Array.isArray(live.q) || live.q.length < 2) return d
  const [model, raw] = await Promise.all([
    loadDemandModel(),
    sb.from(TABLE[d.kind]).select(`marks:data->"${BOOKING_FIELD}"`).eq('airtable_id', d.airtableId).maybeSingle(),
  ])
  if (!model.adr || !model.occ) return d
  if (raw.error) throw new Error(`${TABLE[d.kind]}: ${raw.error.message}`)
  const marks = readMarks((raw.data as { marks?: unknown } | null)?.marks)
  const { feats } = applyMarks(live.base as Record<string, 0 | 1 | null>, marks)
  const lin = (m: { coef: Record<string, number>; intercept: number }) =>
    m.intercept + Object.keys(live.base).reduce((s, k) => s + Number(feats[k] ?? 0) * Number(m.coef[k] ?? 0), 0)
  const adrMult = Math.exp(lin(model.adr))
  const occPct = Math.min(100, Math.max(5, live.occ_avg + lin(model.occ) * 100))
  const index = adrMult * (occPct / live.occ_avg)
  const pct = (100 * live.q.filter(v => v < index).length) / live.q.length
  const score = Math.min(100, Math.max(1, Math.round((1 - live.seg_weight) * pct + live.seg_weight * live.seg_pct)))
  return {
    ...d,
    score,
    adrVsNeighbours: Number(adrMult.toFixed(2)),
    expectedAdrUsd: live.median_adr_usd ? Math.round(live.median_adr_usd * adrMult) : d.expectedAdrUsd,
  }
}

/** Балл одного юнита — для его собственной страницы, с текущими отметками. */
export async function loadOneUnitDemand(kind: UnitKind, airtableId: string, lang: string): Promise<UnitDemand | null> {
  const d = await loadOneUnitDemandCached(kind, airtableId, lang)
  if (!d) return null
  return withLiveMarks(d).catch(e => { console.error('[unit-demand] live marks:', e); return d })
}

const loadOneUnitDemandCached = unstable_cache(
  async (kind: UnitKind, airtableId: string, lang: string) => {
    const { data, error } = await sb
      .from('unit_demand_score')
      .select(SELECT)
      .eq('kind', kind)
      .eq('airtable_id', airtableId)
      .maybeSingle()
    if (error || !data) return null
    return toDemand(data as Row, lang)
  },
  ['unit-demand-one-v2'],
  // Сутки, а не неделя: балл пересчитывается каждую ночь (.github/workflows/demand-score.yml),
  // в том числе после отметок «Для Booking».
  { revalidate: 86400, tags: ['unit-demand'] },
)
