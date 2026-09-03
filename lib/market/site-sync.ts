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

// Разумные границы надбавки сайта к прайсу. Всё, что вне, — не мебель и
// не рассрочка, а несовпадающая пара, и переносить по ней цену нельзя.
const RATIO_MIN = 0.7
const RATIO_MAX = 1.6

// Мелкая разница — это чужое округление, а не движение рынка: кто-то
// записал на сайте $216 000 вместо $215 976. Гонять из-за таких копеек
// инвалидацию кэша и засорять журнал незачем.
const MIN_CHANGE_ABS = 1_000
const MIN_CHANGE_PCT = 0.003

// Допуск по площади. Одной абсолютной величины мало: сайт и прайс меряют
// по-разному (терраса, крыльцо, обмер после стройки), и у большой виллы
// расхождение в метрах больше, чем у студии.
const AREA_TOLERANCE = 2
const AREA_TOLERANCE_PCT = 0.03

// Границы правдоподобия цены в долларах — та же защита, что и в разборе
// прайсов: рупии, приехавшие как доллары, на сайт попасть не должны.
const PRICE_MIN = 5_000
const PRICE_MAX = 50_000_000

export type ListingKind = 'villa' | 'apartment'

const TABLE: Record<ListingKind, string> = {
  villa: 'raw_villas',
  apartment: 'raw_apartments',
}

// Цена объявления лежит в JSONB под тремя именами. Каноничное — то, что
// читает сам сайт (`price` у вилл, `price_usd` у апартаментов); `Цена` —
// наследие Airtable, и в админке такого поля нет вовсе. Пока трекер читал
// только `Цена`, карточка, заведённая или продублированная в /admin/data,
// приходила сюда с ценой донора: у четырёх апартаментов Amani Melasti на
// сайте стояли $157 900…$199 900, а трекер видел $157 000 у всех четырёх —
// и либо не находил пару, либо находил чужую. Читаем каноничное, `Цена`
// оставляем запасным вариантом для старых записей.
const PRICE_FIELD: Record<ListingKind, 'price' | 'priceUsd'> = {
  villa: 'price',
  apartment: 'priceUsd',
}

export type Listing = {
  kind: ListingKind
  id: string
  name: string | null
  complex: string | null
  title: string | null
  developer: string | null
  price: number | null
  area: number | null
  bedrooms: number | null
  published: boolean
}

export type Unit = {
  id: number
  developer: string
  complex: string
  unit_key: string
  area_m2: number | null
  bedrooms: number | null
  status: string
  price_usd: number | null
  // Ниже — то, что нужно только сверке состава каталога (catalog-gaps.ts):
  // из чего собрать новую карточку и в какую коллекцию её класть.
  floor: string | null
  unit_type: string | null
  kind: string | null
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
  ratio: number
  outcome: 'applied' | 'skipped_big_change' | 'skipped_bad_ratio'
  note?: string
}

export type SyncPlan = {
  changes: SyncChange[]
  soldUnits: Array<{ kind: ListingKind; listingId: string; listingName: string | null; unitKey: string; status: string }>
  // Объявления, чья цена сверена с прайсом и совпала. Менять нечего, но
  // дату «цена обновлена» на карточке двигать надо: посетитель читает её
  // как свежесть, а «13 июля» у проверенного сегодня объекта — неправда.
  confirmed: Array<{ kind: ListingKind; listingId: string }>
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
  const names = [...byComplex.keys()]
  const rows: Array<Record<string, unknown>> = []
  let ambiguous = 0
  let unmatched = 0

  for (const l of listings) {
    if (linked.has(`${l.kind}:${l.id}`)) continue
    const pool = poolFor(l, byComplex, names)
    if (!pool?.length) continue

    const found = matchUnit(l, pool)
    if (!found) { unmatched++; continue }
    if (found.ratio < RATIO_MIN || found.ratio > RATIO_MAX) { ambiguous++; continue }

    rows.push({
      listing_kind: l.kind,
      listing_id: l.id,
      unit_id: found.unit.id,
      confidence: found.how,
      // Надбавку каталога к прайсу фиксируем в момент связывания: наши
      // объекты меблированы, а прайс бывает и без мебели, и в рассрочку.
      base_listing_price: l.price,
      base_unit_price: found.unit.price_usd,
      price_ratio: found.ratio,
    })
  }

  if (rows.length) {
    const { error } = await sb
      .from('market_listing_links')
      .upsert(rows, { onConflict: 'listing_kind,listing_id', ignoreDuplicates: true })
    if (error) throw new Error(`запись market_listing_links: ${error.message}`)
  }
  return { linked: rows.length, ambiguous, unmatched }
}

// Пул юнитов комплекса, к которому относится объявление.
//
// У вилл комплекс лежит в поле «Комплекс 1», а у апартаментов такого поля
// нет вовсе — там название комплекса зашито в SEO-заголовок («Апартаменты
// OCEANIQ 2 в Nusa Dua»). Поэтому если поля нет, ищем в заголовке самое
// длинное совпадение с известным комплексом: длинное — значит самое
// конкретное, иначе «Bloom» перебьёт «Bloom Residence».
function poolFor(l: Listing, byComplex: Map<string, Unit[]>, names: string[]): Unit[] | null {
  const key = complexKeyOf(l, byComplex, names)
  return key ? byComplex.get(key) ?? null : null
}

/** Нормализованное имя комплекса, к которому относится объявление, или null. */
export function complexKeyOf(l: Listing, byComplex: Map<string, Unit[]>, names: string[]): string | null {
  const direct = normalize(l.complex)
  if (byComplex.get(direct)?.length) return direct
  if (!l.title) return null

  const title = normalize(l.title)
  let best: string | null = null
  for (const key of names) {
    if (key.length < 4 || !title.includes(key)) continue
    if (!best || key.length > best.length) best = key
  }
  return best
}

// Какой юнит прайса стоит за объявлением.
//
// Площадь — плохой ключ сама по себе: на сайте её меряют с террасой, в
// прайсе без, и у 88 объявлений ближайший по площади юнит оказывался
// чужим. Зато цена — почти отпечаток: сумма вроде $304 920 совпадает не
// случайно. Поэтому сначала ищем точное совпадение цены внутри комплекса
// и только потом идём по площади, а среди одинаковых по площади юнитов
// выбираем того, чья цена ближе к нынешней цене объявления — это и есть
// тот юнит, с которого объявление когда-то завели.
function matchUnit(l: Listing, pool: Unit[]): { unit: Unit; how: 'price' | 'area'; ratio: number } | null {
  if (l.price !== null) {
    const same = pool.filter(u => u.price_usd !== null && Math.abs(u.price_usd - l.price!) < 1)
    if (same.length) {
      const unit = l.area === null ? same[0] : closestBy(same, u => Math.abs((u.area_m2 ?? 1e9) - l.area!))
      return { unit, how: 'price', ratio: 1 }
    }
  }

  if (l.area === null || l.price === null) return null
  const tolerance = Math.max(AREA_TOLERANCE, l.area * AREA_TOLERANCE_PCT)
  let cand = pool.filter(u => u.area_m2 !== null && Math.abs(u.area_m2 - l.area!) <= tolerance)
  // Спальни и застройщика используем как фильтр, только если после него
  // хоть кто-то остаётся: у части прайсов этих полей просто нет.
  if (l.bedrooms !== null && cand.some(u => u.bedrooms === l.bedrooms)) {
    cand = cand.filter(u => u.bedrooms === l.bedrooms)
  }
  if (l.developer && cand.some(u => normalize(u.developer) === normalize(l.developer))) {
    cand = cand.filter(u => normalize(u.developer) === normalize(l.developer))
  }
  const priced = cand.filter(u => u.price_usd !== null)
  if (!priced.length) return null

  const unit = closestBy(priced, u => Math.abs(u.price_usd! - l.price!))
  return { unit, how: 'area', ratio: l.price / unit.price_usd! }
}

function closestBy(units: Unit[], distance: (u: Unit) => number): Unit {
  return units.reduce((best, u) => (distance(u) < distance(best) ? u : best), units[0])
}

// Что изменится, если применить прайсы. Ничего не пишет — этим же планом
// пользуется и сухой прогон, и админка.
export async function planSiteSync(sb: SupabaseClient): Promise<SyncPlan> {
  const { data: links, error } = await sb
    .from('market_listing_links')
    .select('listing_kind, listing_id, unit_id, auto_sync, price_ratio, base_unit_price, base_listing_price')
    .eq('auto_sync', true)
  if (error) throw new Error(`чтение market_listing_links: ${error.message}`)
  if (!links?.length) return { changes: [], soldUnits: [], confirmed: [], checked: 0 }

  const [listings, units] = await Promise.all([loadListings(sb), loadUnits(sb)])
  const listingById = new Map(listings.map(l => [`${l.kind}:${l.id}`, l]))
  const unitById = new Map(units.map(u => [u.id, u]))

  const changes: SyncChange[] = []
  const soldUnits: SyncPlan['soldUnits'] = []
  const confirmed: SyncPlan['confirmed'] = []

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

    const unitPrice = unit.price_usd
    if (unitPrice === null || unitPrice < PRICE_MIN || unitPrice > PRICE_MAX) continue
    const prev = listing.price

    // Пара, заведённая до перехода на надбавку, калибруется на первом же
    // прогоне: запоминаем нынешнее соотношение и цену не трогаем.
    let ratio = link.price_ratio === null || link.price_ratio === undefined ? null : Number(link.price_ratio)
    if (ratio === null) {
      if (prev === null) continue
      ratio = prev / unitPrice
      await sb.from('market_listing_links')
        .update({ price_ratio: ratio, base_listing_price: prev, base_unit_price: unitPrice })
        .eq('listing_kind', kind)
        .eq('listing_id', listing.id)
      continue
    }

    // Без надбавки цена берётся из прайса как есть: округление
    // превратило бы точные $607 530 в $607 500. Округляем только
    // вычисленную цену, иначе на карточке появлялись бы копейки.
    const next = Math.abs(ratio - 1) < 0.0005 ? unitPrice : round100(unitPrice * ratio)
    if (prev !== null && Math.abs(next - prev) < Math.max(MIN_CHANGE_ABS, prev * MIN_CHANGE_PCT)) {
      // Проданный юнит ценой не подтверждает: объявление ещё висит, но
      // купить по этой цене уже нельзя, и датировать это «сегодня» нечестно.
      if (unit.status === 'available') confirmed.push({ kind, listingId: listing.id })
      continue
    }

    const jump = prev ? Math.abs(next - prev) / prev : 0
    const badRatio = ratio < RATIO_MIN || ratio > RATIO_MAX
    changes.push({
      kind,
      listingId: listing.id,
      listingName: listing.name,
      complex: listing.complex,
      unitId: unit.id,
      unitKey: unit.unit_key,
      oldPrice: prev,
      newPrice: next,
      ratio,
      outcome: badRatio ? 'skipped_bad_ratio' : jump > MAX_AUTO_CHANGE ? 'skipped_big_change' : 'applied',
      note: badRatio
        ? `цена объявления отличается от прайса в ${ratio.toFixed(2)} раза — похоже, пара неверная`
        : jump > MAX_AUTO_CHANGE
          ? `цена меняется на ${Math.round(jump * 100)}% — нужен человек`
          : undefined,
    })
  }

  return { changes, soldUnits, confirmed, checked: links.length }
}

// Применить план. Возвращает, сколько объявлений реально переписано.
export type ApplyResult = { applied: number; confirmed: number }

export async function applySiteSync(sb: SupabaseClient, plan: SyncPlan): Promise<ApplyResult> {
  const applied = plan.changes.filter(c => c.outcome === 'applied')

  for (const c of applied) {
    await writePrice(sb, c)
  }

  const confirmed = await touchCheckedDates(sb, plan.confirmed)

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
  const kinds = new Set([
    ...applied.map(c => c.kind),
    ...(confirmed ? plan.confirmed.map(c => c.kind) : []),
  ].map(k => (k === 'villa' ? 'villas' : 'apartments')))
  for (const kind of kinds) await bumpContentRev(kind)

  return { applied: applied.length, confirmed }
}

// Дата «цена обновлена» у подтверждённых объявлений. Одним запросом на
// тип: их сотни, и отдельный апдейт на каждое растянул бы ночной прогон.
async function touchCheckedDates(sb: SupabaseClient, rows: SyncPlan['confirmed']): Promise<number> {
  if (!rows.length) return 0
  const now = new Date().toISOString()
  let touched = 0
  for (const kind of ['villa', 'apartment'] as const) {
    const ids = rows.filter(r => r.kind === kind).map(r => r.listingId)
    if (!ids.length) continue
    const { data, error } = await sb.rpc('market_touch_price_date', { p_kind: kind, p_ids: ids, p_when: now })
    if (error) throw new Error(`отметка даты проверки (${kind}): ${error.message}`)
    touched += Number(data ?? 0)
  }
  return touched
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

export async function loadListings(sb: SupabaseClient): Promise<Listing[]> {
  const out: Listing[] = []
  for (const kind of ['villa', 'apartment'] as const) {
    for (let from = 0; ; from += 1000) {
      // Обе каноничные цены разом: `data` — JSONB, и лишний ключ на чужой
      // таблице просто приходит null. Так строка select остаётся литералом,
      // из которого supabase-js выводит тип ответа.
      const { data, error } = await sb
        .from(TABLE[kind])
        .select('airtable_id, name:data->>Name, complex:data->>"Комплекс 1", title:data->>"SEO:Title", developer:data->>Developer1, price:data->>price, priceUsd:data->>price_usd, legacyPrice:data->>"Цена", area:data->>"Площадь", bedrooms:data->>"Комнаты", published:data->>"Опубликовать"')
        .range(from, from + 999)
      if (error) throw new Error(`чтение ${TABLE[kind]}: ${error.message}`)
      if (!data?.length) break
      for (const r of data as Array<Record<string, unknown>>) {
        out.push({
          kind,
          id: String(r.airtable_id),
          name: str(r.name),
          complex: str(r.complex),
          title: str(r.title),
          developer: str(r.developer),
          price: numberOrNull(r[PRICE_FIELD[kind]]) ?? numberOrNull(r.legacyPrice),
          area: numberOrNull(r.area),
          bedrooms: numberOrNull(r.bedrooms),
          published: String(r.published ?? '') !== 'false',
        })
      }
      if (data.length < 1000) break
    }
  }
  return out
}

export async function loadUnits(sb: SupabaseClient): Promise<Unit[]> {
  const out: Unit[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('market_units')
      .select('id, developer, complex, unit_key, area_m2, bedrooms, status, price_usd, floor, unit_type, kind')
      .range(from, from + 999)
    if (error) throw new Error(`чтение market_units: ${error.message}`)
    if (!data?.length) break
    for (const r of data as Array<Record<string, unknown>>) {
      out.push({
        id: Number(r.id),
        developer: String(r.developer ?? ''),
        complex: String(r.complex ?? ''),
        unit_key: String(r.unit_key ?? ''),
        area_m2: numberOrNull(r.area_m2),
        bedrooms: numberOrNull(r.bedrooms),
        status: String(r.status ?? ''),
        price_usd: numberOrNull(r.price_usd),
        floor: str(r.floor),
        unit_type: str(r.unit_type),
        kind: str(r.kind),
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

export function groupByComplex(units: Unit[]): Map<string, Unit[]> {
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

// Цену округляем до сотни: надбавка за мебель — доля, и без округления
// на карточке появлялись бы суммы вида $293 550,25.
function round100(v: number): number {
  return Math.round(v / 100) * 100
}

// Названия комплекса в двух системах пишут по-разному: регистр, точки,
// скобки, лишние пробелы. Сравниваем только буквы и цифры.
export function normalize(v: string | null | undefined): string {
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
