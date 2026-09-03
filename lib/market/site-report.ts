// Данные для страницы «Цены на сайте» в админке: что уже связано, что
// ждёт руки и что автообновление меняло за последние дни.

import { sbAdmin } from './apply'

export type LinkedRow = {
  kind: 'villa' | 'apartment'
  listingId: string
  listingName: string | null
  complex: string | null
  listingPrice: number | null
  listingArea: number | null
  unitId: number
  unitKey: string
  unitPrice: number | null
  unitArea: number | null
  unitStatus: string
  confidence: string
  autoSync: boolean
  // Во сколько раз цена каталога отличается от прайса: мебель, рассрочка
  // или наценка. Синхронизация двигает цену вместе с этой надбавкой.
  ratio: number | null
  // Тот же юнит прайса продаётся в каталоге не одним объявлением: это не
  // ошибка связывания, а разные предложения — другая комплектация или
  // перепродажа от инвестора со своей ценой.
  sharedUnit: boolean
  unitResale: boolean
}

export type PendingRow = {
  kind: 'villa' | 'apartment'
  listingId: string
  listingName: string | null
  complex: string | null
  listingPrice: number | null
  listingArea: number | null
  listingBedrooms: number | null
  candidates: Array<{ id: number; label: string }>
}

export type LogRow = {
  at: string
  kind: string
  listingId: string
  oldPrice: number | null
  newPrice: number | null
  outcome: string
  note: string | null
}

export type SiteReport = {
  linked: LinkedRow[]
  pending: PendingRow[]
  log: LogRow[]
  totals: { listings: number; inTrackedComplexes: number; linked: number; autoOff: number; checkedToday: number }
}

const norm = (v: string | null | undefined) => String(v ?? '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '')
const num = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export async function loadSiteReport(): Promise<SiteReport> {
  const sb = sbAdmin()

  const listings: Array<Record<string, unknown> & { kind: 'villa' | 'apartment' }> = []
  // Цена — та же, что читает сайт (`price` / `price_usd`), с откатом на
  // наследственную `Цена`. См. PRICE_FIELD в site-sync.ts: отчёт обязан
  // показывать ровно ту цену, по которой связывает и сверяет синхронизация.
  for (const [kind, table, priceKey] of [
    ['villa', 'raw_villas', 'price'],
    ['apartment', 'raw_apartments', 'priceUsd'],
  ] as const) {
    for (let from = 0; ; from += 1000) {
      const { data } = await sb
        .from(table)
        .select('airtable_id, name:data->>Name, complex:data->>"Комплекс 1", price:data->>price, priceUsd:data->>price_usd, legacyPrice:data->>"Цена", area:data->>"Площадь", bedrooms:data->>"Комнаты", published:data->>"Опубликовать", updated:data->>"Обновление цены"')
        .range(from, from + 999)
      if (!data?.length) break
      for (const r of data) listings.push({ ...r, price: r[priceKey] ?? r.legacyPrice, kind })
      if (data.length < 1000) break
    }
  }

  const units: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from('market_units')
      .select('id, complex, developer, unit_key, area_m2, bedrooms, status, price_usd, is_resale')
      .range(from, from + 999)
    if (!data?.length) break
    units.push(...data)
    if (data.length < 1000) break
  }

  const { data: links } = await sb.from('market_listing_links').select('listing_kind, listing_id, unit_id, confidence, auto_sync, price_ratio')
  // Один юнит на два объявления — обычно «с мебелью» и «без»: помечаем,
  // чтобы это было видно, а не выглядело ошибкой связывания.
  const unitUse = new Map<number, number>()
  for (const l of links ?? []) unitUse.set(Number(l.unit_id), (unitUse.get(Number(l.unit_id)) ?? 0) + 1)
  const { data: log } = await sb
    .from('market_listing_sync_log')
    .select('applied_at, listing_kind, listing_id, old_price, new_price, outcome, note')
    .order('applied_at', { ascending: false })
    .limit(60)

  const byComplex = new Map<string, Array<Record<string, unknown>>>()
  for (const u of units) {
    const k = norm(u.complex as string)
    if (!k) continue
    const list = byComplex.get(k)
    if (list) list.push(u)
    else byComplex.set(k, [u])
  }

  const unitById = new Map(units.map(u => [Number(u.id), u]))
  const linkByListing = new Map((links ?? []).map(l => [`${l.listing_kind}:${l.listing_id}`, l]))

  const linked: LinkedRow[] = []
  const pending: PendingRow[] = []
  let inTracked = 0

  for (const l of listings) {
    const key = `${l.kind}:${String(l.airtable_id)}`
    const pool = byComplex.get(norm(l.complex as string))
    if (pool?.length) inTracked++

    const link = linkByListing.get(key)
    if (link) {
      const u = unitById.get(Number(link.unit_id))
      if (!u) continue
      linked.push({
        kind: l.kind,
        listingId: String(l.airtable_id),
        listingName: (l.name as string) ?? null,
        complex: (l.complex as string) ?? null,
        listingPrice: num(l.price),
        listingArea: num(l.area),
        unitId: Number(u.id),
        unitKey: String(u.unit_key),
        unitPrice: num(u.price_usd),
        unitArea: num(u.area_m2),
        unitStatus: String(u.status),
        confidence: String(link.confidence),
        autoSync: Boolean(link.auto_sync),
        ratio: num(link.price_ratio),
        sharedUnit: (unitUse.get(Number(link.unit_id)) ?? 0) > 1,
        unitResale: Boolean(u.is_resale),
      })
      continue
    }

    if (!pool?.length) continue
    // Кандидатов показываем всех по комплексу, но ближайшие по площади
    // ставим первыми — руками выбирать из пятидесяти строк невозможно.
    const area = num(l.area)
    const sorted = [...pool].sort((a, b) => {
      const da = area && num(a.area_m2) !== null ? Math.abs(num(a.area_m2)! - area) : 1e9
      const db = area && num(b.area_m2) !== null ? Math.abs(num(b.area_m2)! - area) : 1e9
      return da - db
    })
    pending.push({
      kind: l.kind,
      listingId: String(l.airtable_id),
      listingName: (l.name as string) ?? null,
      complex: (l.complex as string) ?? null,
      listingPrice: num(l.price),
      listingArea: area,
      listingBedrooms: num(l.bedrooms),
      candidates: sorted.slice(0, 40).map(u => ({
        id: Number(u.id),
        label: `${u.unit_key} — ${num(u.area_m2) ?? '?'} м², ${num(u.bedrooms) ?? '?'} сп., ${num(u.price_usd) ? '$' + Number(u.price_usd).toLocaleString('ru-RU') : 'без цены'} (${u.status})`,
      })),
    })
  }

  return {
    linked: linked.sort((a, b) => (a.complex ?? '').localeCompare(b.complex ?? '')),
    pending: pending.sort((a, b) => (a.complex ?? '').localeCompare(b.complex ?? '')),
    log: (log ?? []).map(r => ({
      at: String(r.applied_at),
      kind: String(r.listing_kind),
      listingId: String(r.listing_id),
      oldPrice: num(r.old_price),
      newPrice: num(r.new_price),
      outcome: String(r.outcome),
      note: (r.note as string) ?? null,
    })),
    totals: {
      // «Проверено сегодня» — то, что видит посетитель на карточке: цена
      // сверена с прайсом застройщика, даже если она не поменялась.
      checkedToday: listings.filter(l => String(l.updated ?? '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      listings: listings.length,
      inTrackedComplexes: inTracked,
      linked: linked.length,
      autoOff: linked.filter(l => !l.autoSync).length,
    },
  }
}
