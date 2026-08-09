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
  } | null
  why_ru: string | null
  why_en: string | null
}

function toDemand(row: Row, lang: string): UnitDemand | null {
  if (row.comps_n < MIN_TRUSTWORTHY_COMPS) return null
  const f = row.facts ?? {}
  return {
    kind: row.kind,
    airtableId: row.airtable_id,
    score: row.score,
    basis: row.basis,
    zone: row.zone,
    compsN: row.comps_n,
    adrVsNeighbours: f.predicted?.adr_vs_neighbours ?? null,
    expectedAdrUsd: f.predicted?.expected_adr_usd ?? null,
    segmentOccupancyPct: f.market?.mean_occupancy_pct ?? null,
    segmentIdlePct: f.market?.idle_share_pct ?? null,
    drivers: f.drivers ?? [],
    // Пояснение живёт на двух языках; остальные локали получают английское,
    // а не машинный перевод на лету — он тут дороже пользы.
    why: (lang === 'ru' ? row.why_ru : row.why_en) ?? row.why_en ?? null,
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
  { revalidate: 3600, tags: ['unit-demand'] },
)

/** Балл одного юнита — для его собственной страницы. */
export const loadOneUnitDemand = unstable_cache(
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
  ['unit-demand-one'],
  { revalidate: 3600, tags: ['unit-demand'] },
)
