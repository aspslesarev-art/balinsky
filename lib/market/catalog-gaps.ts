// Сверка СОСТАВА каталога с прайсами застройщиков.
//
// site-sync.ts следит за ценой уже связанных пар. Но пары нет у того, чего на
// сайте вообще нет: застройщик открыл продажи новых юнитов, а карточек под них
// никто не завёл. Это и делалось руками — открыть прайс, пройти по зелёным
// строкам и на каждую проверить, есть ли такая карточка. На 03.09 из 700
// уникальных свободных предложений на сайте было представлено 274.
//
// Здесь считается, чего не хватает, и заводятся карточки — по образцу уже
// опубликованной карточки того же комплекса: у неё есть фото, район, сроки,
// условия сделки и тексты. Меняются площадь, цена, этаж и число спален, а
// метраж в текстах переписывается тем же механизмом, что и при обычной правке
// площади в админке (area-sync.ts). Модель не зовём: всё нужное выводится из
// юнита и донора.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCollection } from '@/lib/admin/collections'
import { adapterFor } from '@/lib/admin/adapters'
import { getPhotos, setPhotos } from '@/lib/admin/photos'
import { revalidateCollection } from '@/lib/admin/revalidate'
import { areaSyncPatch } from '@/lib/admin/area-sync'
import { priceSyncPatch } from '@/lib/admin/price-sync'
import { unitTitle } from '@/lib/admin/unit-defaults'
import type { CollectionConfig } from '@/lib/admin/adapters/types'
import {
  complexKeyOf, groupByComplex, loadListings, loadUnits, normalize,
  type Listing, type ListingKind, type Unit,
} from './site-sync'

// Один и тот же юнит в прайсе повторяется десятками (десять одинаковых студий
// в корпусе), а в каталоге это ОДНА карточка. Поэтому считаем не юниты, а
// различимые предложения: площадь + число спален + цена.
export type Offer = {
  key: string
  area: number | null
  bedrooms: number | null
  price: number
  unitIds: number[]
  unitKeys: string[]
  floor: string | null
  unitType: string | null
}

export type ComplexGap = {
  complexKey: string
  complex: string
  developer: string
  kind: ListingKind
  /** Опубликованная карточка комплекса, по образцу которой заводим новые. */
  donorId: string | null
  donorName: string | null
  /** Надбавка каталога к прайсу в этом комплексе (медиана по связкам). */
  ratio: number
  missing: Offer[]
  covered: number
}

// Насколько площадь сайта может расходиться с прайсом и всё ещё считаться тем
// же предложением: те же допуски, что и при связывании (site-sync.ts) — на
// сайте метры меряют с террасой.
const AREA_TOLERANCE = 2
const AREA_TOLERANCE_PCT = 0.03

// Насколько цена карточки может отличаться от «цена прайса × надбавка», чтобы
// считать предложение уже представленным. Шире, чем допуск синхронизации:
// здесь достаточно понять «такое предложение на сайте есть», а не «цена верна».
const COVER_PRICE_TOLERANCE = 0.12

function areaMatches(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b
  return Math.abs(a - b) <= Math.max(AREA_TOLERANCE, b * AREA_TOLERANCE_PCT)
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Свободные юниты одного вида, свёрнутые в различимые предложения. */
function offersOf(units: Unit[]): Offer[] {
  const byKey = new Map<string, Offer>()
  for (const u of units) {
    if (u.status !== 'available' || u.price_usd === null) continue
    const key = `${u.area_m2 ?? '—'}|${u.bedrooms ?? '—'}|${u.price_usd}`
    const found = byKey.get(key)
    if (found) {
      found.unitIds.push(u.id)
      found.unitKeys.push(u.unit_key)
      continue
    }
    byKey.set(key, {
      key,
      area: u.area_m2,
      bedrooms: u.bedrooms,
      price: u.price_usd,
      unitIds: [u.id],
      unitKeys: [u.unit_key],
      floor: u.floor,
      unitType: u.unit_type,
    })
  }
  return [...byKey.values()].sort((a, b) => a.price - b.price)
}

// Донор — образец, по которому заводить новые карточки. Берём опубликованную
// (у снятой с публикации могла быть причина) и самую типичную по площади: у
// такой вероятнее всего есть фото и заполненные тексты.
function pickDonor(listings: Listing[]): Listing | null {
  const published = listings.filter(l => l.published !== false)
  const pool = published.length ? published : listings
  if (!pool.length) return null
  const mid = median(pool.map(l => l.area).filter((a): a is number => a !== null))
  if (mid === null) return pool[0]
  return pool.reduce((best, l) => (
    Math.abs((l.area ?? Infinity) - mid) < Math.abs((best.area ?? Infinity) - mid) ? l : best
  ), pool[0])
}

/** Вид, в котором комплекс уже представлен в каталоге (кого больше). */
function majorityKind(listings: Listing[]): ListingKind | null {
  if (!listings.length) return null
  const villas = listings.filter(l => l.kind === 'villa').length
  return villas * 2 >= listings.length ? 'villa' : 'apartment'
}

export async function loadCatalogGaps(sb: SupabaseClient): Promise<ComplexGap[]> {
  const [listings, units, linkRows] = await Promise.all([
    loadListings(sb),
    loadUnits(sb),
    sb.from('market_listing_links').select('listing_kind, listing_id, unit_id, price_ratio'),
  ])
  const links = linkRows.data ?? []
  const linkedUnitIds = new Set(links.map(l => Number(l.unit_id)))
  const ratioOfListing = new Map(links.map(l => [`${l.listing_kind}:${l.listing_id}`, Number(l.price_ratio)]))

  const byComplex = groupByComplex(units)
  const names = [...byComplex.keys()]

  // Объявления сайта раскладываются по комплексам трекера тем же правилом, что
  // и при связывании: поле «Комплекс 1», иначе — самое длинное совпадение
  // названия комплекса в заголовке.
  const siteByComplex = new Map<string, Listing[]>()
  for (const l of listings) {
    const key = complexKeyOf(l, byComplex, names)
    if (!key) continue
    const list = siteByComplex.get(key)
    if (list) list.push(l)
    else siteByComplex.set(key, [l])
  }

  const out: ComplexGap[] = []
  for (const [key, complexUnits] of byComplex) {
    const site = siteByComplex.get(key) ?? []
    const ratios = site
      .map(l => ratioOfListing.get(`${l.kind}:${l.id}`))
      .filter((r): r is number => r !== undefined && Number.isFinite(r) && r > 0)
    const ratio = median(ratios) ?? 1

    // Вид карточки диктует сам каталог: если комплекс живёт в апартаментах,
    // новая карточка идёт туда же. Классификация трекера — второй голос, она
    // угадывает по прайсу и путает виллы с апартаментами. Комплекс бывает и
    // смешанным (Pandawa Dream: и виллы, и апартаменты) — тогда каждый юнит
    // идёт в свой вид, и комплекс попадает в отчёт двумя строками.
    const fallbackKind = majorityKind(site) ?? 'apartment'
    const kindsOnSite = new Set(site.map(l => l.kind))
    const unitsByKind = new Map<ListingKind, Unit[]>()
    for (const u of complexUnits) {
      const own = u.kind === 'villa' || u.kind === 'apartment' ? u.kind as ListingKind : null
      const kind = own && kindsOnSite.has(own) ? own : fallbackKind
      const list = unitsByKind.get(kind)
      if (list) list.push(u)
      else unitsByKind.set(kind, [u])
    }

    for (const [kind, kindUnits] of unitsByKind) {
      const offers = offersOf(kindUnits)
      if (!offers.length) continue
      // Сверяемся только со «своими» карточками: 44-метровая вилла не
      // закрывает 44-метровый апартамент.
      const sameKind = site.filter(l => l.kind === kind)

      const missing = offers.filter(o => {
        // Связка — самый надёжный признак: карточка уже привязана к юниту
        // этого предложения, спрашивать больше не о чем.
        if (o.unitIds.some(id => linkedUnitIds.has(id))) return false
        const expected = o.price * ratio
        return !sameKind.some(l =>
          areaMatches(l.area, o.area)
          && l.price !== null
          && Math.abs(l.price - expected) / expected <= COVER_PRICE_TOLERANCE,
        )
      })
      if (!missing.length) continue

      // Образец — только своего вида: из полей виллы апартамент не соберёшь.
      const donor = pickDonor(sameKind)
      out.push({
        complexKey: key,
        complex: complexUnits[0]?.complex ?? key,
        developer: complexUnits[0]?.developer ?? '',
        kind,
        donorId: donor?.id ?? null,
        donorName: donor?.name ?? null,
        ratio,
        missing,
        covered: offers.length - missing.length,
      })
    }
  }

  return out.sort((a, b) => b.missing.length - a.missing.length)
}

export type CreateResult = {
  created: Array<{ id: string; title: string; price: number; unitKey: string }>
  errors: Array<{ offerKey: string; error: string }>
}

/**
 * Завести карточки под выбранные предложения комплекса. Пустой `offerKeys` —
 * значит все недостающие этого комплекса и вида.
 */
export async function createListingsForGaps(
  sb: SupabaseClient,
  complexKey: string,
  kind: ListingKind,
  offerKeys: string[],
): Promise<CreateResult> {
  const gaps = await loadCatalogGaps(sb)
  const wantedKey = normalize(complexKey)
  const gap = gaps.find(g => g.kind === kind && (g.complexKey === wantedKey || g.complexKey === complexKey))
  if (!gap) {
    return { created: [], errors: [{ offerKey: complexKey, error: 'комплекс без пробелов или не отслеживается' }] }
  }
  if (!gap.donorId) {
    return {
      created: [],
      errors: [{ offerKey: complexKey, error: 'в комплексе нет ни одной карточки — первую заведите руками, дальше пойдёт по образцу' }],
    }
  }

  const cfg = getCollection(gap.kind === 'villa' ? 'villas' : 'apartments')
  if (!cfg) return { created: [], errors: [{ offerKey: complexKey, error: 'unknown_collection' }] }
  const donor = await adapterFor(cfg).get(cfg, gap.donorId)
  if (!donor) return { created: [], errors: [{ offerKey: complexKey, error: 'карточка-образец не читается' }] }

  const wanted = offerKeys.length ? gap.missing.filter(o => offerKeys.includes(o.key)) : gap.missing
  const result: CreateResult = { created: [], errors: [] }

  for (const offer of wanted) {
    try {
      result.created.push(await createOne(sb, cfg, gap, donor.fields, offer))
    } catch (e) {
      result.errors.push({ offerKey: offer.key, error: e instanceof Error ? e.message : 'create_failed' })
    }
  }
  return result
}

const PRICE_KEY: Record<ListingKind, string> = { villa: 'price', apartment: 'price_usd' }

// Уникальное у копии не переносится: slug — публичный адрес, и копия с чужим
// slug просто затенила бы оригинал (та же логика, что в /duplicate).
const UNIQUE_KEYS = new Set(['SEO:Slug', '_slug_alias', 'airtable_id', 'slug', 'ID', 'Post ID'])

async function createOne(
  sb: SupabaseClient,
  cfg: CollectionConfig,
  gap: ComplexGap,
  donorFields: Record<string, unknown>,
  offer: Offer,
): Promise<{ id: string; title: string; price: number; unitKey: string }> {
  const base = Object.fromEntries(
    Object.entries(donorFields).filter(([k]) => !UNIQUE_KEYS.has(k)),
  )

  // Метраж зашит в два десятка строк карточки — переписываем его тем же
  // механизмом, что и правка площади в админке, иначе новая карточка
  // рекламирует площадь донора.
  const areaPatch = offer.area === null ? {} : areaSyncPatch(cfg, base, { 'Площадь': offer.area })

  // Цена прайса умножается на надбавку комплекса: в каталоге объекты
  // меблированы, и новая карточка должна стоять в одном ряду с соседями,
  // а не выбиваться голой ценой застройщика.
  const price = Math.round((offer.price * gap.ratio) / 100) * 100
  const draft: Record<string, unknown> = {
    ...base,
    ...areaPatch,
    'Комплекс 1': gap.complex,
    [PRICE_KEY[gap.kind]]: price,
  }
  if (offer.area !== null) draft['Площадь'] = offer.area
  if (offer.bedrooms !== null) draft['Комнаты'] = offer.bedrooms
  if (offer.floor) draft['Этаж'] = [String(offer.floor)]

  const withPrice = { ...draft, ...priceSyncPatch(cfg, {}, draft) }
  // Заголовок собирается по той же формуле, что и у карточки, заведённой
  // руками, — иначе в нём осталась бы площадь донора.
  const fields = { ...withPrice, [cfg.titleField]: unitTitle(gap.kind, withPrice) }

  const row = await adapterFor(cfg).create(cfg, fields)

  if (cfg.photo && gap.donorId) {
    try {
      const photos = await getPhotos(cfg, gap.donorId)
      if (photos.length) await setPhotos(cfg, row.id, photos)
    } catch (e) {
      console.error(`[catalog-gaps] photos ${cfg.key}/${row.id}:`, e instanceof Error ? e.message : e)
    }
  }

  // Пару заводим сразу: карточка создана ИЗ юнита, гадать не о чем, и уже со
  // следующего обхода её цена живёт вместе с прайсом. `confidence: 'price'` —
  // связка держится на точном совпадении цены (мы её из этого юнита и взяли);
  // отдельного значения под «заведено автоматом» в check-констрейнте нет.
  const { error } = await sb.from('market_listing_links').upsert({
    listing_kind: gap.kind,
    listing_id: row.id,
    unit_id: offer.unitIds[0],
    confidence: 'price',
    base_listing_price: price,
    base_unit_price: offer.price,
    price_ratio: gap.ratio,
  }, { onConflict: 'listing_kind,listing_id' })
  if (error) throw new Error(`запись market_listing_links: ${error.message}`)

  // Карточка и пара уже записаны — сорванная инвалидация не повод сообщать
  // «не удалось создать»: кэш карточек живёт час, и ночная сверка поднимает
  // content_version сама.
  try {
    await revalidateCollection(cfg, row.id)
  } catch (e) {
    console.error(`[catalog-gaps] revalidate ${cfg.key}/${row.id}:`, e instanceof Error ? e.message : e)
  }
  return { id: row.id, title: String(fields[cfg.titleField] ?? ''), price, unitKey: offer.unitKeys[0] }
}
