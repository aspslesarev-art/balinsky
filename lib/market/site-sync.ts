// Обновление цен объявлений сайта из прайсов застройщиков.
//
// Трекер знает цену каждого юнита, но объявление сайта — не юнит: у него
// внутренний код (V00638), а не номер из шахматки, и в комплексе бывает
// десяток одинаковых по площади юнитов. Поэтому пара «объявление ↔ юнит»
// фиксируется один раз в market_listing_links, а ночной прогон просто
// сверяет цену по этой паре. Автоматически заводятся только однозначные
// пары; остальное — руками в админке.

import type { SupabaseClient } from '@supabase/supabase-js'
import { bumpContentRev } from '@/lib/content-version'

// Насколько цена может уехать за раз, чтобы автомат применил её молча.
// Скидка в четверть цены — уже не рутина: либо застройщик объявил акцию,
// либо пара составлена неверно. И то и другое стоит увидеть глазами.
const MAX_AUTO_CHANGE = 0.25

// Совпадение по площади с допуском: сайт округляет, прайс — нет.
const AREA_TOLERANCE = 2

// Границы правдоподобия цены в долларах — та же защита, что и в разборе
// прайсов: рупии, приехавшие как доллары, на сайт попасть не должны.
const PRICE_MIN = 5_000
const PRICE_MAX = 50_000_000

export type ListingKind = 'villa' | 'apartment'

const TABLE: Record<ListingKind, string> = {
  villa: 'raw_villas',
  apartment: 'raw_apartments',
}

type Listing = {
  kind: ListingKind
  id: string
  name: string | null
  complex: string | null
  price: number | null
  area: number | null
  bedrooms: number | null
}

type Unit = {
  id: number
  complex: string
  unit_key: string
  area_m2: number | null
  bedrooms: number | null
  status: string
  price_usd: number | null
}

export type LinkResult = { linked: number; ambiguous: number; unmatched: number }

export type SyncChange = {
  kind: ListingKind
  listingId: string
  listingName: string | null
  complex: string | null
  unitId: number
  unitKey: string
  oldPrice: number | null
  newPrice: number
  outcome: 'applied' | 'skipped_big_change'
  note?: string
}

export type SyncPlan = {
  changes: SyncChange[]
  soldUnits: Array<{ kind: ListingKind; listingId: string; listingName: string | null; unitKey: string; status: string }>
  checked: number
}

// Завести пары там, где они однозначны: в комплексе ровно один юнит
// подходящей площади. Уже заведённые пары не трогаем — среди них есть
// проставленные руками.
export async function linkListings(sb: SupabaseClient): Promise<LinkResult> {
  const [listings, units, linked] = await Promise.all([
    loadListings(sb),
    loadUnits(sb),
    loadLinkedIds(sb),
  ])

  const byComplex = groupByComplex(units)
  const rows: Array<Record<string, unknown>> = []
  let ambiguous = 0
  let unmatched = 0

  for (const l of listings) {
    if (linked.has(`${l.kind}:${l.id}`)) continue
    const pool = byComplex.get(normalize(l.complex))
    if (!pool?.length || l.area === null) continue

    const near = pool.filter(u => u.area_m2 !== null && Math.abs(u.area_m2 - l.area!) <= AREA_TOLERANCE)
    const narrowed = l.bedrooms !== null && near.length > 1
      ? near.filter(u => u.bedrooms === l.bedrooms)
      : near

    if (narrowed.length === 1) {
      rows.push({ listing_kind: l.kind, listing_id: l.id, unit_id: narrowed[0].id, confidence: 'area' })
    } else if (narrowed.length > 1) {
      ambiguous++
    } else {
      unmatched++
    }
  }

  if (rows.length) {
    const { error } = await sb
      .from('market_listing_links')
      .upsert(rows, { onConflict: 'listing_kind,listing_id', ignoreDuplicates: true })
    if (error) throw new Error(`запись market_listing_links: ${error.message}`)
  }
  return { linked: rows.length, ambiguous, unmatched }
}

// Что изменится, если применить прайсы. Ничего не пишет — этим же планом
// пользуется и сухой прогон, и админка.
export async function planSiteSync(sb: SupabaseClient): Promise<SyncPlan> {
  const { data: links, error } = await sb
    .from('market_listing_links')
    .select('listing_kind, listing_id, unit_id, auto_sync')
    .eq('auto_sync', true)
  if (error) throw new Error(`чтение market_listing_links: ${error.message}`)
  if (!links?.length) return { changes: [], soldUnits: [], checked: 0 }

  const [listings, units] = await Promise.all([loadListings(sb), loadUnits(sb)])
  const listingById = new Map(listings.map(l => [`${l.kind}:${l.id}`, l]))
  const unitById = new Map(units.map(u => [u.id, u]))

  const changes: SyncChange[] = []
  const soldUnits: SyncPlan['soldUnits'] = []

  for (const link of links) {
    const kind = link.listing_kind as ListingKind
    const listing = listingById.get(`${kind}:${link.listing_id}`)
    const unit = unitById.get(Number(link.unit_id))
    if (!listing || !unit) continue

    // Проданный юнит — сигнал человеку, а не повод трогать объявление:
    // «Статус» на сайте про стадию стройки, а не про продажу, и снимать
    // объявление с публикации автомату не поручали.
    if (unit.status === 'sold' || unit.status === 'reserved') {
      soldUnits.push({ kind, listingId: listing.id, listingName: listing.name, unitKey: unit.unit_key, status: unit.status })
    }

    const next = unit.price_usd
    if (next === null || next < PRICE_MIN || next > PRICE_MAX) continue
    const prev = listing.price
    if (prev !== null && Math.abs(next - prev) < 1) continue

    const jump = prev ? Math.abs(next - prev) / prev : 0
    changes.push({
      kind,
      listingId: listing.id,
      listingName: listing.name,
      complex: listing.complex,
      unitId: unit.id,
      unitKey: unit.unit_key,
      oldPrice: prev,
      newPrice: next,
      outcome: jump > MAX_AUTO_CHANGE ? 'skipped_big_change' : 'applied',
      note: jump > MAX_AUTO_CHANGE ? `цена меняется на ${Math.round(jump * 100)}% — нужен человек` : undefined,
    })
  }

  return { changes, soldUnits, checked: links.length }
}

// Применить план. Возвращает, сколько объявлений реально переписано.
export async function applySiteSync(sb: SupabaseClient, plan: SyncPlan): Promise<number> {
  const applied = plan.changes.filter(c => c.outcome === 'applied')

  for (const c of applied) {
    await writePrice(sb, c)
  }

  const log = [
    ...plan.changes.map(c => ({
      listing_kind: c.kind,
      listing_id: c.listingId,
      unit_id: c.unitId,
      old_price: c.oldPrice,
      new_price: c.newPrice,
      outcome: c.outcome,
      note: c.note ?? null,
    })),
    ...plan.soldUnits.map(s => ({
      listing_kind: s.kind,
      listing_id: s.listingId,
      unit_id: null,
      old_price: null,
      new_price: null,
      outcome: 'unit_sold',
      note: `юнит ${s.unitKey} в прайсе застройщика: ${s.status}`,
    })),
  ]
  if (log.length) {
    const { error } = await sb.from('market_listing_sync_log').insert(log)
    if (error) throw new Error(`запись market_listing_sync_log: ${error.message}`)
  }

  // Каталог и карточки объектов держат данные в памяти процесса, и
  // тегами Next до них не достать — только через content_version. Роут
  // крона поверх этого ещё сбрасывает теги и ISR-пути.
  const kinds = new Set(applied.map(c => (c.kind === 'villa' ? 'villas' : 'apartments')))
  for (const kind of kinds) await bumpContentRev(kind)

  return applied.length
}

// Цена лежит в JSONB под несколькими именами сразу: страницы читают то
// `price`, то `Цена`, а `Цена м²` и дата обновления показываются на
// карточке объекта. Пишем все, иначе на сайте останется разнобой.
async function writePrice(sb: SupabaseClient, c: SyncChange): Promise<void> {
  const table = TABLE[c.kind]
  const { data, error } = await sb.from(table).select('data').eq('airtable_id', c.listingId).single()
  if (error) throw new Error(`чтение ${table}: ${error.message}`)

  const prev = (data?.data ?? {}) as Record<string, unknown>
  const area = numberOrNull(prev['Площадь'])
  const next: Record<string, unknown> = {
    ...prev,
    'Цена': c.newPrice,
    'Обновление цены': new Date().toISOString(),
  }
  if (c.kind === 'villa') next['price'] = c.newPrice
  else next['price_usd'] = c.newPrice
  if (area) next['Цена м²'] = Math.round((c.newPrice / area) * 100) / 100

  const { error: writeErr } = await sb.from(table).update({ data: next }).eq('airtable_id', c.listingId)
  if (writeErr) throw new Error(`запись ${table}: ${writeErr.message}`)
}

async function loadListings(sb: SupabaseClient): Promise<Listing[]> {
  const out: Listing[] = []
  for (const kind of ['villa', 'apartment'] as const) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from(TABLE[kind])
        .select('airtable_id, name:data->>Name, complex:data->>"Комплекс 1", price:data->>"Цена", area:data->>"Площадь", bedrooms:data->>"Комнаты"')
        .range(from, from + 999)
      if (error) throw new Error(`чтение ${TABLE[kind]}: ${error.message}`)
      if (!data?.length) break
      for (const r of data as Array<Record<string, unknown>>) {
        out.push({
          kind,
          id: String(r.airtable_id),
          name: str(r.name),
          complex: str(r.complex),
          price: numberOrNull(r.price),
          area: numberOrNull(r.area),
          bedrooms: numberOrNull(r.bedrooms),
        })
      }
      if (data.length < 1000) break
    }
  }
  return out
}

async function loadUnits(sb: SupabaseClient): Promise<Unit[]> {
  const out: Unit[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('market_units')
      .select('id, complex, unit_key, area_m2, bedrooms, status, price_usd')
      .range(from, from + 999)
    if (error) throw new Error(`чтение market_units: ${error.message}`)
    if (!data?.length) break
    for (const r of data as Array<Record<string, unknown>>) {
      out.push({
        id: Number(r.id),
        complex: String(r.complex ?? ''),
        unit_key: String(r.unit_key ?? ''),
        area_m2: numberOrNull(r.area_m2),
        bedrooms: numberOrNull(r.bedrooms),
        status: String(r.status ?? ''),
        price_usd: numberOrNull(r.price_usd),
      })
    }
    if (data.length < 1000) break
  }
  return out
}

async function loadLinkedIds(sb: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await sb.from('market_listing_links').select('listing_kind, listing_id')
  if (error) throw new Error(`чтение market_listing_links: ${error.message}`)
  return new Set((data ?? []).map(r => `${r.listing_kind}:${r.listing_id}`))
}

function groupByComplex(units: Unit[]): Map<string, Unit[]> {
  const out = new Map<string, Unit[]>()
  for (const u of units) {
    const key = normalize(u.complex)
    if (!key) continue
    const list = out.get(key)
    if (list) list.push(u)
    else out.set(key, [u])
  }
  return out
}

// Названия комплекса в двух системах пишут по-разному: регистр, точки,
// скобки, лишние пробелы. Сравниваем только буквы и цифры.
function normalize(v: string | null): string {
  return String(v ?? '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '')
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

function numberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}
