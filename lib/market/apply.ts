// Сведение свежего среза прайса с тем, что уже в базе: обновляем карточки
// юнитов, пишем срез за сегодня и события изменений.
//
// События — то, ради чего всё затевалось: они отвечают на «что продано за
// сегодня / за неделю / за месяц», «что вернулось в продажу» и «как
// двигалась цена конкретного юнита».

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { MarketSource, ScrapedUnit, UnitStatus } from './types'

const BATCH = 500

export type ApplyResult = {
  units: number
  created: number
  events: number
  gone: number
}

type ExistingUnit = {
  id: number
  unit_key: string
  status: UnitStatus
  price_usd: number | null
  first_seen: string
  last_seen: string
  sold_at: string | null
  returned_count: number
}

type EventRow = {
  unit_id: number
  source_id: number
  d: string
  kind: 'listed' | 'sold' | 'reserved' | 'returned' | 'price_up' | 'price_down' | 'gone'
  old_status: string | null
  new_status: string | null
  old_price: number | null
  new_price: number | null
}

export function sbAdmin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  })
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function applyScrape(
  sb: SupabaseClient,
  source: MarketSource,
  input: ScrapedUnit[],
  opts: { day?: string; prevScanDay?: string | null } = {},
): Promise<ApplyResult> {
  let scraped = input
  const day = opts.day ?? today()

  // Пустой результат в базу не пускаем: это почти всегда сломанный
  // разбор, а не распроданный комплекс. Иначе один плохой прогон
  // запишет в историю, что застройщик продал всё за сутки.
  if (!scraped.length) throw new Error('пустой результат разбора — в базу не пишем')

  const existing = await loadExisting(sb, source.id)
  const byKey = new Map(existing.map(u => [u.unit_key, u]))
  scraped = dedupeKeys(scraped)

  const rows: Record<string, unknown>[] = []
  const events: Array<Omit<EventRow, 'unit_id'> & { unit_key: string }> = []

  for (const u of scraped) {
    const prev = byKey.get(u.unitKey)
    const returned = prev ? isReturn(prev.status, u.status) : false

    rows.push({
      source_id: source.id,
      unit_key: u.unitKey,
      developer: source.developer,
      complex: source.complex,
      unit_type: u.unitType,
      bedrooms: u.bedrooms,
      area_m2: u.areaM2,
      land_m2: u.landM2,
      floor: u.floor,
      status: u.status,
      price_usd: u.priceUsd,
      price_per_m2: u.pricePerM2,
      first_seen: prev?.first_seen ?? day,
      last_seen: day,
      sold_at: u.status === 'sold' ? (prev?.status === 'sold' ? prev.sold_at ?? day : day) : null,
      returned_count: (prev?.returned_count ?? 0) + (returned ? 1 : 0),
      raw: u.raw,
      updated_at: new Date().toISOString(),
    })

    for (const e of diffUnit(prev, u, day, source.id)) events.push({ ...e, unit_key: u.unitKey })
  }

  // Юнит пропал из прайса. Это не продажа — застройщик мог перекроить
  // лист, — поэтому статус не трогаем, а факт фиксируем, и только в тот
  // день, когда юнит пропал впервые.
  let gone = 0
  const seenKeys = new Set(scraped.map(u => u.unitKey))
  const prevDay = opts.prevScanDay ?? null
  for (const prev of existing) {
    if (seenKeys.has(prev.unit_key)) continue
    if (!prevDay || prev.last_seen !== prevDay || prevDay === day) continue
    events.push({
      unit_key: prev.unit_key,
      source_id: source.id,
      d: day,
      kind: 'gone',
      old_status: prev.status,
      new_status: null,
      old_price: prev.price_usd,
      new_price: null,
    })
    gone++
  }

  const created = scraped.filter(u => !byKey.has(u.unitKey)).length

  const ids = await upsertUnits(sb, rows)
  // События «пропал» указывают на юниты, которых в свежем срезе нет, так
  // что их id берём из ранее загруженных.
  for (const prev of existing) if (!ids.has(prev.unit_key)) ids.set(prev.unit_key, prev.id)

  await writeDaily(sb, scraped, ids, day)
  const written = await writeEvents(sb, events, ids)

  return { units: scraped.length, created, events: written, gone }
}

// Один номер юнита на источник — на нём держится вся история. В
// генпланах номер иногда повторяется (соседние очереди строительства),
// а Postgres не даст двум одинаковым ключам приехать одним upsert-ом,
// поэтому разводим суффиксом, а не теряем юнит.
function dedupeKeys(units: ScrapedUnit[]): ScrapedUnit[] {
  const seen = new Map<string, number>()
  return units.map(u => {
    const n = (seen.get(u.unitKey) ?? 0) + 1
    seen.set(u.unitKey, n)
    return n === 1 ? u : { ...u, unitKey: `${u.unitKey}~${n}` }
  })
}

// Возврат в продажу: юнит уходил из свободных, а теперь снова свободен.
function isReturn(prev: UnitStatus, next: UnitStatus): boolean {
  return (prev === 'sold' || prev === 'reserved') && next === 'available'
}

function diffUnit(
  prev: ExistingUnit | undefined,
  u: ScrapedUnit,
  day: string,
  sourceId: number,
): Array<Omit<EventRow, 'unit_id'>> {
  const base = { source_id: sourceId, d: day }

  if (!prev) {
    return [{ ...base, kind: 'listed', old_status: null, new_status: u.status, old_price: null, new_price: u.priceUsd }]
  }

  const out: Array<Omit<EventRow, 'unit_id'>> = []

  if (prev.status !== u.status) {
    const kind = isReturn(prev.status, u.status)
      ? 'returned'
      : u.status === 'sold'
        ? 'sold'
        : u.status === 'reserved'
          ? 'reserved'
          : 'listed'
    out.push({ ...base, kind, old_status: prev.status, new_status: u.status, old_price: prev.price_usd, new_price: u.priceUsd })
  }

  // Цену сравниваем, только когда известны обе: пропавшая цена — это
  // чаще всего «юнит продан, сумму убрали», а не скидка до нуля.
  if (prev.price_usd !== null && u.priceUsd !== null && Number(prev.price_usd) !== u.priceUsd) {
    out.push({
      ...base,
      kind: u.priceUsd > Number(prev.price_usd) ? 'price_up' : 'price_down',
      old_status: prev.status,
      new_status: u.status,
      old_price: Number(prev.price_usd),
      new_price: u.priceUsd,
    })
  }

  return out
}

async function loadExisting(sb: SupabaseClient, sourceId: number): Promise<ExistingUnit[]> {
  const out: ExistingUnit[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('market_units')
      .select('id, unit_key, status, price_usd, first_seen, last_seen, sold_at, returned_count')
      .eq('source_id', sourceId)
      .range(from, from + 999)
    if (error) throw new Error(`чтение market_units: ${error.message}`)
    if (!data?.length) break
    out.push(...(data as ExistingUnit[]))
    if (data.length < 1000) break
  }
  return out
}

// Возвращает unit_key → id для всех записанных юнитов.
async function upsertUnits(sb: SupabaseClient, rows: Record<string, unknown>[]): Promise<Map<string, number>> {
  const ids = new Map<string, number>()
  for (let i = 0; i < rows.length; i += BATCH) {
    const { data, error } = await sb
      .from('market_units')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'source_id,unit_key' })
      .select('id, unit_key')
    if (error) throw new Error(`запись market_units: ${error.message}`)
    for (const r of data ?? []) ids.set(String(r.unit_key), Number(r.id))
  }
  return ids
}

async function writeDaily(sb: SupabaseClient, scraped: ScrapedUnit[], ids: Map<string, number>, day: string): Promise<void> {
  const rows = scraped
    .map(u => {
      const id = ids.get(u.unitKey)
      return id ? { unit_id: id, d: day, status: u.status, price_usd: u.priceUsd } : null
    })
    .filter((r): r is { unit_id: number; d: string; status: UnitStatus; price_usd: number | null } => r !== null)

  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await sb.from('market_unit_daily').upsert(rows.slice(i, i + BATCH), { onConflict: 'unit_id,d' })
    if (error) throw new Error(`запись market_unit_daily: ${error.message}`)
  }
}

async function writeEvents(
  sb: SupabaseClient,
  events: Array<Omit<EventRow, 'unit_id'> & { unit_key: string }>,
  ids: Map<string, number>,
): Promise<number> {
  const rows = events
    .map(({ unit_key, ...e }) => {
      const id = ids.get(unit_key)
      return id ? { ...e, unit_id: id } : null
    })
    .filter((r): r is EventRow => r !== null)

  for (let i = 0; i < rows.length; i += BATCH) {
    // Событие одного вида на юнит в день уникально (индекс в базе), так
    // что повторный прогон за те же сутки ничего не размножит.
    const { error } = await sb
      .from('market_unit_events')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'unit_id,d,kind', ignoreDuplicates: true })
    if (error) throw new Error(`запись market_unit_events: ${error.message}`)
  }
  return rows.length
}
