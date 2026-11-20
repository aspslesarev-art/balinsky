import type { Analysis, Source, Viz } from './types'
import type { InvestmentSnapshot } from '@/lib/investment/snapshot'
import type { AirbnbComp } from '@/lib/airbnb-nearby'
import type { SaleCompsBundle } from '@/lib/sale-comps'
import type { GeoFacts } from '@/lib/complex-access'
import type { NearbyPlace, NearbyCategory } from '@/lib/nearby-places'
import { zoneRows, zoneKind, plotLabel, type RdtrData } from '@/lib/rdtr-zones'
import type { LandPriceBundle } from '@/lib/land-prices'
import type { Tourism } from './tourism'
import { cdnRewrite } from '@/lib/photo-cdn'
import { BALI_HUBS, type ExtraRoute, type Travel } from './extra-routes'
import type { BookingFit } from './booking-fit'
import { BOOKING_EXTRA } from '@/lib/booking-amenities'
import type { UnitDemand } from '@/lib/unit-demand'
import type { Landmark } from '@/lib/landmarks'
import type { NearbyVenue } from '@/lib/surroundings'
import climate2050 from '@/lib/bali-climate-2050.json'

// Собирает анализы блока «Аналитика по объекту» из того, что страница виллы
// уже загрузила. Анализ без данных не показываем — лучше меньше пунктов,
// чем пустая анимация. Тексты пока RU + EN (остальные языки — EN), переводы
// по «ок» владельца.

export type VillaAnalyticsInput = {
  lang: string
  lat: number | null
  lng: number | null
  bedrooms: number | null
  priceUsd: number | null
  status: string | null
  permit: string | null
  yearRaw: string | null
  leaseYears: number | null
  snap: InvestmentSnapshot | null
  airbnb: AirbnbComp[]
  sale: SaleCompsBundle | null
  geo: GeoFacts | null
  nearby: { categories: NearbyCategory[]; byCategory: Record<string, NearbyPlace[]> } | null
  rdtr: { data: RdtrData; image: string } | null
  /** Честные счётчики хороших мест в 1 км (listing_surroundings.r1); списки nearby обрезаны по 20–30 на тип. */
  around1km: Record<string, number> | null
  /** Участки на продаже рядом (lib/land-prices) и площадь своего участка, м². */
  landPrices: LandPriceBundle | null
  landM2: number | null
  tourism: Tourism | null
  landmarks: Landmark[]
  /** Доля заведений вокруг для иностранцев, 0–100 (listing_surroundings). */
  touristShare: number | null
  /** Лучшие места рядом с фото (listing_surroundings.top). */
  aroundTop: NearbyVenue[]
  /** Маршруты до ближайшего пляжа и мест TripAdvisor. */
  extraRoutes: ExtraRoute[]
  /** Маршруты по дорогам до аэропорта и главных районов (OSRM). */
  hubRoutes: ExtraRoute[]
  /** Время в пути по дорогам: ключи `ta:<rank>`, `lm:<id>`. */
  travel: Travel
  /** Балл востребованности на Booking среди соседей (unit_demand_score). */
  demand: UnitDemand | null
  /** Признаки с фото и их вклад в цену ночи на Booking (lib/analytics-panel/booking-fit). */
  bookingFit: BookingFit | null
  /** Чей это объект: подписи «вилла» / «апартаменты». По умолчанию вилла. */
  kind?: 'villa' | 'apartment'
}

const GREEN = '#1F8B5F'
const ORANGE = '#E78C3D'
const BLUE = '#2E7DD1'
const PURPLE = '#8E5BD0'

function med(xs: number[]): number | null {
  const a = xs.filter(Number.isFinite).sort((x, y) => x - y)
  if (!a.length) return null
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

export function buildVillaAnalyses(i: VillaAnalyticsInput): Analysis[] {
  const ru = i.lang === 'ru'
  const T = (r: string, e: string) => (ru ? r : e)
  // Апартаменты (страница апартаментов, 20.11.2026): свои слова вместо «вилла».
  const apt = i.kind === 'apartment'
  const VA = (villa: string, apartment: string) => (apt ? apartment : villa)
  const loc = ru ? 'ru-RU' : 'en-US'
  const num = (n: number) => Math.round(n).toLocaleString(loc)
  // Деньги — меткой ⟦usd⟧: панель на клиенте подставит валюту посетителя.
  const usd = (n: number) => `⟦${Math.round(n * 100) / 100}⟧`
  const dist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} ${T('м', 'm')}` : `${km.toFixed(1).replace('.', ru ? ',' : '.')} ${T('км', 'km')}`)
  const G = { money: T('Деньги', 'Money'), docs: T('Документы и участок', 'Documents & land'), place: T('Место', 'Location'), life: VA(T('Жизнь в доме', 'Living'), T('Жизнь и климат', 'Living')) }
  const out: Analysis[] = []
  // «пешком 6 мин» / «12 мин на машине» вместо километров; нет данных — км.
  const trip = (key: string, kmFallback: number) => { const t = i.travel[key]; if (!t) return dist(kmFallback); return t.meters <= 2500 ? T(`пешком ${Math.max(1, Math.round(t.meters / 80))} мин`, `${Math.max(1, Math.round(t.meters / 80))} min walk`) : T(`${t.min} мин на машине`, `${t.min} min drive`) }
  // Карта, подогнанная под набор линий (самый крупный зум, при котором всё влезает).
  const fitMap = (title: string, lines: { coords: number[][]; color: string; label: string }[], from: { lat: number; lng: number }): Viz => {
    const pts = [...lines.flatMap(l => l.coords), [from.lng, from.lat]]
    const lngs = pts.map(p => p[0]), lats = pts.map(p => p[1])
    const wx = (x: number, z: number) => ((x + 180) / 360) * 256 * 2 ** z
    const wy = (y: number, z: number) => { const r = (y * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 256 * 2 ** z }
    let z = 16
    while (z > 8 && (wx(Math.max(...lngs), z) - wx(Math.min(...lngs), z) > 820 || wy(Math.min(...lats), z) - wy(Math.max(...lats), z) > 540)) z--
    return { kind: 'map', title, center: { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 }, zoom: z, aspect: 1.5, base: 'street', credit: 'Esri, OpenStreetMap', alt: title, lines,
      pins: [{ ...from, color: '#0F1A15' }], tags: lines.map(l => ({ lat: l.coords[l.coords.length - 1][1], lng: l.coords[l.coords.length - 1][0], label: l.label })) }
  }
  const dec = (x: number) => String(x).replace('.', ru ? ',' : '.')
  // «2026-11-13» → «13.11.2026».
  // «maksimal : 50%» → «до 50%» (поля KDB/KDH госплана).
  // Правила госплана приходят строкой («maksimum : 65%», «2,6») или объектом
  // по типам дорог ({ «Fungsi Jalan Lokal»: ['65%'] }) — собираем все числа.
  const ruleNums = (x: unknown): number[] => typeof x === 'string' ? (x.match(/\d+(?:[.,]\d+)?/g) ?? []).map(n => Number(n.replace(',', '.')))
    : Array.isArray(x) ? x.flatMap(ruleNums) : x && typeof x === 'object' ? Object.values(x).flatMap(ruleNums) : []
  const rule = (x: unknown, unit: string) => {
    const n = ruleNums(x).filter(v => v > 0); if (!n.length) return null
    const lo = Math.min(...n), hi = Math.max(...n)
    return { lo, hi, text: lo === hi ? `${dec(lo)}${unit}` : `${dec(lo)}–${dec(hi)}${unit}` }
  }
  // «Peraturan Bupati Tabanan Nomor 45 Tahun 2025 …» → «постановление 45/2025».
  const rd8 = (x: string | null) => { const m = x?.match(/Nomor\s+(\d+)\s+Tahun\s+(\d{4})/i); return m ? T(`постановление ${m[1]}/${m[2]}`, `regulation ${m[1]}/${m[2]}`) : 'ATR/BPN' }
  const plw = (n: number, f: string) => { const [a1, a2, a5] = f.split('|'); const a = Math.abs(Math.round(n)) % 100, b = a % 10; return a > 10 && a < 20 ? a5 : b === 1 ? a1 : b >= 2 && b <= 4 ? a2 : a5 }
  const d8 = (x: string) => { const m = x.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1]}` : x }
  const center = i.lat != null && i.lng != null ? { lat: i.lat, lng: i.lng } : null

  // ── Сдавать посуточно ──────────────────────────────────────────────
  const comps = (i.snap?.competitors ?? []).filter(c => c.adr > 0)
  if (comps.length >= 3 || i.airbnb.length >= 3) {
    const sources: Source[] = []
    const vizs: Viz[] = []
    const occOf = (c: (typeof comps)[number]) => c.facts?.roomOcc ?? c.facts?.occ ?? null
    const adrMed = med(comps.map(c => c.adr))
    const occs = comps.map(occOf).filter((x): x is number => x != null)
    const occAvg = occs.length ? occs.reduce((s, x) => s + x, 0) / occs.length : null
    if (comps.length >= 3 && i.snap) {
      const total = Math.max(i.snap.totalCompetitorsInRadius ?? 0, comps.length)
      sources.push({
        name: 'Booking', fresh: T('обновляется каждый день', 'updated daily'),
        chips: [dist(i.snap.searchRadiusKm), i.bedrooms ? T(`${i.bedrooms} спальни`, `${i.bedrooms} bedrooms`) : T('похожие', 'similar'), T('посуточно', 'per night')],
        total, unit: T('объект|объекта|объектов', 'listings'),
        names: comps.slice(0, 16).map(c => c.name),
        result: T(`${num(total)} ${plw(total, 'объект|объекта|объектов')} рядом → ${comps.length} похожих · середина ${usd(adrMed ?? 0)} за ночь`, `${num(total)} listings nearby → ${comps.length} similar · median ${usd(adrMed ?? 0)} a night`),
        items: comps.slice(0, 8).map(c => {
          const o = occOf(c)
          return { photo: c.facts?.roomPhoto ?? c.photo, name: c.name, url: c.url, meta: [usd(c.adr), o != null ? T(`занято ${Math.round(o)}%`, `${Math.round(o)}% booked`) : null, dist(c.distanceKm)].filter(Boolean).join(' · ') }
        }),
      })
      if (occs.length >= 3) {
        sources.push({
          name: 'estatemarket', fresh: T('загрузка за месяц', 'occupancy, last month'),
          chips: [T(`${occs.length} ${plw(occs.length, 'объект|объекта|объектов')} с Booking`, `${occs.length} Booking listings`), T('последний месяц', 'last month')],
          total: occs.length * 31, unit: T('ночь|ночи|ночей', 'nights'),
          names: comps.filter(c => occOf(c) != null).slice(0, 10).map(c => `${c.name} — ${Math.round(occOf(c)!)}%`),
          result: T(`Похожие объекты заняты в среднем ${Math.round(occAvg!)}% ночей за месяц`, `Similar listings are booked ${Math.round(occAvg!)}% of nights on average`),
        })
        const pts = comps.filter(c => occOf(c) != null)
        const xs = pts.map(c => c.adr)
        const lo = Math.floor(Math.min(...xs) * 0.95), hi = Math.ceil(Math.max(...xs) * 1.05)
        vizs.push({
          kind: 'scatter', title: T('Цена за ночь и загрузка соседей (Booking)', 'Nightly rate vs occupancy (Booking)'),
          points: pts.slice(0, 12).map(c => ({ x: c.adr, y: occOf(c)!, label: c.name.split(/[-–·|,]/)[0].trim().slice(0, 18), good: occOf(c)! >= 75 })),
          xLo: lo, xHi: hi, yLo: Math.max(0, Math.floor((Math.min(...occs) - 10) / 10) * 10), yHi: 100, xLoLabel: usd(lo), xHiLabel: usd(hi), yLoLabel: `${Math.max(0, Math.floor((Math.min(...occs) - 10) / 10) * 10)}%`, yHiLabel: '100%',
          caption: T('По горизонтали — цена за ночь, по вертикали — сколько ночей занято', 'Horizontal: nightly rate; vertical: share of nights booked'),
        })
      }
    }
    const abPrices = i.airbnb.map(a => a.priceUsd).filter(p => p > 0)
    const abMed = med(abPrices)
    if (abPrices.length >= 3) {
      sources.push({
        name: 'Airbnb', fresh: T('обновляется каждый день', 'updated daily'),
        chips: [T('рядом', 'nearby'), i.bedrooms ? T(`${i.bedrooms} спальни`, `${i.bedrooms} bedrooms`) : T('похожие', 'similar')],
        total: i.airbnb.length, unit: T('объявление|объявления|объявлений', 'listings'),
        names: i.airbnb.slice(0, 12).map(a => a.name),
        result: T(`${i.airbnb.length} ${plw(i.airbnb.length, 'объявление|объявления|объявлений')} рядом · половина берёт до ${usd(abMed!)} за ночь`, `${i.airbnb.length} listings nearby · half charge up to ${usd(abMed!)} a night`),
        items: i.airbnb.slice(0, 8).map(a => ({ photo: a.photo, name: a.name, url: a.url, meta: [usd(a.priceUsd), a.rating ? `★ ${a.rating.toFixed(1)}` : null, dist(a.distanceKm)].filter(Boolean).join(' · ') })),
      })
      const lo = Math.floor(Math.min(...abPrices) * 0.9), hi = Math.ceil(Math.max(...abPrices) * 1.1)
      vizs.push({ kind: 'strip', title: T(`Цены за ночь на Airbnb: ${abPrices.length} ${plw(abPrices.length, 'объявление|объявления|объявлений')}`, `Airbnb nightly rates: ${abPrices.length} listings`), points: abPrices, lo, hi, mark: { value: abMed!, label: T(`середина ${usd(abMed!)}`, `median ${usd(abMed!)}`) }, loLabel: usd(lo), hiLabel: usd(hi) })
    }
    const nightly = adrMed ?? abMed
    if (sources.length && nightly != null) {
      out.push({
        id: 'daily', group: G.money, title: T('Сдавать посуточно', 'Short-term rental'),
        sub: T('Сколько берут соседи за ночь и как часто у них заняты даты', 'What neighbours charge a night and how often they are booked'),
        sources, vizs,
        bigs: [{ v: usd(nightly), l: T('за ночь у соседей — середина', 'a night, neighbours’ median') }, ...(occAvg != null ? [{ v: `${Math.round(occAvg)}%`, l: T('ночей заняты за месяц', 'nights booked last month') }] : [])],
        meaning: occAvg == null ? T(`похожие объекты рядом берут около ${usd(nightly)} за ночь.`, `similar places nearby charge about ${usd(nightly)} a night.`)
          : occAvg >= 75 ? T('похожие объекты рядом почти всегда заняты — спрос на посуточную аренду здесь есть.', 'similar places nearby are almost always booked — there is demand for short stays here.')
          : occAvg >= 50 ? T('похожие объекты заняты больше половины ночей — спрос есть, но выбирать гостям есть из чего.', 'similar places are booked over half the nights — demand exists, but guests have choice.')
          : T('похожие объекты заняты меньше половины ночей — посуточно здесь сдаётся тяжело.', 'similar places are booked under half the nights — short-term rental is slow here.'),
        footnote: occAvg != null ? T('Загрузка — по estatemarket за месяц, считаются и даты, закрытые хозяином.', 'Occupancy from estatemarket for the last month; owner-blocked dates count as booked.') : undefined,
      })
    }
  }

  // ── Оценить для Booking ────────────────────────────────────────────
  // Что видно на фото и сколько это даёт к цене ночи на Booking (модель по
  // ~12 тыс. объектам Бали) + балл среди соседей того же типа и размера.
  const bf = i.bookingFit
  if (bf) {
    const FL: Record<string, [string, string]> = {
      pool_infinity: ['Инфинити-бассейн', 'Infinity pool'], pool_private: ['Свой бассейн', 'Private pool'], pool_shared: ['Общий бассейн', 'Shared pool'], pool_none: ['Без бассейна', 'No pool'],
      view_ocean_full: ['Вид на океан', 'Ocean view'], view_ocean_partial: ['Океан виден частично', 'Partial ocean view'], view_nature: ['Вид на рисовые поля, джунгли или горы', 'Rice field, jungle or mountain view'],
      open_air_living: ['Открытая гостиная', 'Open-air living room'], double_height: ['Высокий потолок в два этажа', 'Double-height ceiling'], glass_wall: ['Панорамные окна в пол', 'Floor-to-ceiling windows'],
      rooftop_terrace: ['Терраса на крыше', 'Rooftop terrace'], private_garden: ['Свой сад', 'Private garden'], sala_gazebo: ['Беседка-сала', 'Sala gazebo'], thatch_alang: ['Крыша из травы алан-алан', 'Alang-alang thatched roof'],
      bathtub: ['Ванна', 'Bathtub'], outdoor_shower: ['Душ под открытым небом', 'Outdoor shower'], spacious: ['Просторные комнаты', 'Spacious rooms'], cramped: ['Тесноватые комнаты', 'Cramped rooms'],
      outdoor_living_hi: ['Много жизни на улице', 'Lots of outdoor living'], multi_level: ['Несколько уровней', 'Several levels'], balcony: ['Балкон', 'Balcony'],
    }
    const pctTxt = (x: number) => { const p = Math.round((x - 1) * 100); return `${p >= 0 ? '+' : '−'}${Math.abs(p)}%` }
    const lab = (k: string) => T(FL[k]?.[0] ?? k, FL[k]?.[1] ?? k)
    const keys = Object.keys(bf.adr).filter(k => FL[k])
    // Слабые минусы (меньше 5%) — шум модели, а не вывод: не показываем.
    const present = keys.filter(k => bf.feats[k] === 1 && (bf.adr[k] >= 1 || bf.adr[k] <= 0.95)).sort((a, b) => bf.adr[b] - bf.adr[a])
    const missing = keys.filter(k => bf.feats[k] === 0 && bf.adr[k] >= 1.08 && !(k.startsWith('pool_') && present.some(p => p.startsWith('pool_'))) && !(k === 'view_ocean_partial' && bf.feats.view_ocean_full === 0)).sort((a, b) => bf.adr[b] - bf.adr[a])
    const unknown = keys.filter(k => bf.feats[k] == null && bf.adr[k] >= 1.08)
    const top = [...keys].filter(k => bf.adr[k] > 1.03).sort((a, b) => bf.adr[b] - bf.adr[a])
    // Пометка, если признак отметил человек в «Редактировать → Для Booking», а не ИИ по фото.
    const human = new Set(bf.byHuman)
    const by = (k: string) => (human.has(k) ? T(' · отмечено вручную', ' · marked by hand') : '')
    const extras = BOOKING_EXTRA.filter(x => bf.marks[x.key] === 'yes')
    const aiPresent = present.filter(k => !human.has(k))
    if (present.length) {
      const dm = i.demand
      const rows: Extract<Viz, { kind: 'checks' }>['rows'] = [
        ...present.map(k => ({ state: (bf.adr[k] >= 1 ? 'ok' : 'warn') as 'ok' | 'warn', label: lab(k) + by(k), value: T(`${pctTxt(bf.adr[k])} к цене ночи`, `${pctTxt(bf.adr[k])} per night`) })),
        ...missing.slice(0, 3).map(k => ({ state: 'info' as const, label: T(`Нет: ${lab(k).toLowerCase()}`, `Missing: ${lab(k).toLowerCase()}`) + by(k), value: T(`у кого есть — ${pctTxt(bf.adr[k])}`, `those who have it: ${pctTxt(bf.adr[k])}`) })),
      ]
      const vizs: Viz[] = [{ kind: 'checks', title: T('Что важно гостям Booking', 'What matters to Booking guests'), rows }]
      if (extras.length) vizs.push({ kind: 'checks', title: T('Ещё есть для гостей', 'Also for guests'),
        rows: extras.map(x => ({ state: 'ok' as const, label: T(x.ru, x.en), value: T('на цену не считаем', 'not priced') })) })
      if (dm) vizs.unshift({ kind: 'gauge', title: T(`Среди ${dm.compsN} похожих объектов рядом на Booking`, `Among ${dm.compsN} similar listings nearby on Booking`), avg: Math.min(97, Math.max(3, dm.score)), min: null, max: null,
        avgLabel: T(`${dm.score} из 100`, `${dm.score} of 100`), loLabel: T('слабее соседей', 'weaker'), hiLabel: T('сильнее соседей', 'stronger'),
        caption: T(`${VA('Вилла', 'Апартаменты')} ожидаемо сильнее ${dm.score}% объектов того же типа и размера рядом.`, `The ${VA('villa', 'apartment')} is expected to beat ${dm.score}% of similar listings nearby.`) })
      vizs.push({ kind: 'bars', title: T('Что сильнее всего поднимает цену ночи на Бали', 'What lifts the nightly rate most in Bali'), max: Math.max(...top.slice(0, 7).map(k => bf.adr[k] - 1)), color: GREEN,
        rows: top.slice(0, 7).map(k => ({ label: lab(k) + (bf.feats[k] === 1 ? T(' ✓ есть', ' ✓ has') : ''), value: bf.adr[k] - 1, text: pctTxt(bf.adr[k]) })) })
      const sources: Source[] = [
        { name: T(`ИИ разбирает фото ${VA('виллы', 'апартаментов')}`, `AI reviews the ${VA('villa', 'apartment')} photos`), fresh: T(`${bf.photos} ${plw(bf.photos, 'фото|фото|фото')}`, `${bf.photos} photos`),
          chips: [T('вид', 'view'), T('бассейн', 'pool'), T('планировка', 'layout'), T('ванная', 'bathroom')],
          total: aiPresent.length, unit: T('признак|признака|признаков', 'features'),
          names: [...aiPresent.map(lab), ...(bf.wow ? [T(`изюминка: ${bf.wow}`, `standout: ${bf.wow}`)] : [])],
          result: aiPresent.length ? T(`Нашёл: ${aiPresent.map(k => lab(k).toLowerCase()).join(', ')}`, `Found: ${aiPresent.map(k => lab(k).toLowerCase()).join(', ')}`) : T('Сверх отмеченного вручную ничего не нашёл', 'Nothing beyond the hand-marked items') },
        ...(human.size || extras.length ? [{ name: T('Отмечено вручную', 'Marked by hand'), fresh: T('застройщик или Balinsky', 'developer or Balinsky'),
          chips: [T('есть', 'has'), T('нет', 'missing')], total: human.size + extras.length, unit: T('пункт|пункта|пунктов', 'items'),
          names: [...[...human].map(k => `${lab(k)} — ${bf.marks[k] === 'yes' ? T('есть', 'yes') : T('нет', 'no')}`), ...extras.map(x => T(x.ru, x.en))],
          result: T(`Есть: ${[...[...human].filter(k => bf.marks[k] === 'yes').map(lab), ...extras.map(x => x.ru)].map(x => x.toLowerCase()).join(', ') || '—'}`, `Has: ${[...[...human].filter(k => bf.marks[k] === 'yes').map(lab), ...extras.map(x => x.en)].map(x => x.toLowerCase()).join(', ') || '—'}`) }] : []),
        { name: T('Booking: за что гости платят больше', 'Booking: what guests pay more for'), fresh: T(`${num(bf.nMarket)} объектов Бали`, `${num(bf.nMarket)} Bali listings`),
          chips: [T('цена ночи', 'nightly rate'), T('признаки с фото', 'photo features'), T('сравнение с соседями', 'vs neighbours')],
          total: bf.nMarket, unit: T('объект|объекта|объектов', 'listings'),
          names: top.slice(0, 10).map(k => `${lab(k)} — ${pctTxt(bf.adr[k])}`),
          result: T(`Сильнее всего цену поднимают: ${top.slice(0, 3).map(k => `${lab(k).toLowerCase()} ${pctTxt(bf.adr[k])}`).join(', ')}`, `Biggest rate lifts: ${top.slice(0, 3).map(k => `${lab(k).toLowerCase()} ${pctTxt(bf.adr[k])}`).join(', ')}`) },
      ]
      if (dm) sources.push({ name: T(`Соседи на Booking · ${dm.zone}`, `Booking neighbours · ${dm.zone}`), fresh: T('тот же тип и размер', 'same type and size'),
        chips: [T('цена ночи', 'nightly rate'), T('загрузка', 'occupancy')], total: dm.compsN, unit: T('объект|объекта|объектов', 'listings'),
        names: dm.drivers.slice(0, 5).map(d => `${lab(d.feature)} — ${T(`у ${d.share_in_stratum}% соседей`, `${d.share_in_stratum}% of neighbours`)}`),
        result: [dm.segmentOccupancyPct != null ? T(`загрузка сегмента ${Math.round(dm.segmentOccupancyPct)}%`, `segment occupancy ${Math.round(dm.segmentOccupancyPct)}%`) : null, dm.expectedAdrUsd ? T(`ожидаемая цена ночи ${usd(dm.expectedAdrUsd)}`, `expected nightly rate ${usd(dm.expectedAdrUsd)}`) : null].filter(Boolean).join(' · ') || T('сравнили с соседями', 'compared with neighbours') })
      const best = present.filter(k => bf.adr[k] >= 1.03)
      out.push({
        id: 'booking', group: G.money, title: T('Оценить для Booking', 'Rate for Booking'),
        sub: T('Что важно гостям и сколько это даёт к цене ночи', 'What guests value and what it adds per night'),
        sources, vizs,
        bigs: [...(dm ? [{ v: T(`${dm.score} из 100`, `${dm.score} of 100`), l: T('против соседей на Booking', 'vs Booking neighbours') }] : []),
          ...(dm?.expectedAdrUsd ? [{ v: usd(dm.expectedAdrUsd), l: T('ожидаемая цена ночи', 'expected nightly rate') }] : [{ v: String(present.length), l: T('признаков на фото', 'photo features') }])],
        meaning: [
          dm ? (dm.score >= 70 ? T(`на Booking ${VA('вилла', 'апартаменты')} сильнее большинства похожих объектов рядом`, `on Booking the ${VA('villa', 'apartment')} beats most similar listings nearby`) : dm.score <= 45 ? T(`на Booking ${VA('вилла', 'апартаменты')} слабее многих похожих объектов рядом`, `on Booking the ${VA('villa', 'apartment')} is weaker than many similar listings nearby`) : T(`на Booking ${VA('вилла', 'апартаменты')} на уровне похожих объектов рядом`, `on Booking the ${VA('villa', 'apartment')} is on par with similar listings nearby`)) : null,
          best.length ? T(`в плюс — ${best.slice(0, 3).map(k => lab(k).toLowerCase()).join(', ')}`, `pluses: ${best.slice(0, 3).map(k => lab(k).toLowerCase()).join(', ')}`) : null,
        ].filter(Boolean).join('; ') + '.',
        footnote: T(`Учитываем то, что видно на фото и рендерах, и отметки застройщика.${unknown.length ? ` Пока не понять: ${unknown.slice(0, 3).map(k => lab(k).toLowerCase()).join(', ')}.` : ''} Кофемашину, Wi-Fi и другие мелочи видно гостю, но на цену ночи по нашим данным они не влияют.`, `Based on photos, renders and the developer’s marks.${unknown.length ? ` Still unclear: ${unknown.slice(0, 3).map(k => lab(k).toLowerCase()).join(', ')}.` : ''} Coffee machine, Wi-Fi and similar extras are shown to guests but don’t move the nightly rate in our data.`),
      })
    }
  }

  // ── Сдавать надолго ────────────────────────────────────────────────
  const m = i.snap?.monthly
  if (m && m.n > 0) {
    const sources: Source[] = []
    const rumah = m.comps.filter(c => c.distanceKm != null)
    const own = m.comps.filter(c => c.distanceKm == null)
    sources.push({
      name: 'rumah123', fresh: T(`данные на ${d8(m.asOf)}`, `as of ${d8(m.asOf)}`),
      chips: [dist(m.radiusKm), i.bedrooms ? T(`${i.bedrooms} спальни`, `${i.bedrooms} bedrooms`) : T('похожие', 'similar'), T('на месяц и год', 'monthly & yearly')],
      total: m.n, unit: T('объявление|объявления|объявлений', 'listings'),
      names: m.comps.slice(0, 12).map(c => c.title),
      result: T(`${m.n} ${plw(m.n, 'объявление|объявления|объявлений')} → середина ${usd(m.p50)} в месяц (от ${usd(m.p25)} до ${usd(m.p75)})`, `${m.n} listings → median ${usd(m.p50)} a month (${usd(m.p25)}–${usd(m.p75)})`),
      items: rumah.slice(0, 8).map(c => ({ photo: c.photo, name: c.title, url: c.url, meta: [T(`${usd(c.rentMonthUsd)}/мес`, `${usd(c.rentMonthUsd)}/mo`), c.distanceKm != null ? dist(c.distanceKm) : null].filter(Boolean).join(' · ') })),
    })
    if (own.length) {
      sources.push({
        name: T('Facebook и Telegram', 'Facebook & Telegram'), fresh: T('наш сбор', 'our collection'),
        chips: [m.ownDistrict ?? T('район', 'district'), T('аренда', 'rent')],
        total: own.length, unit: T('объявление|объявления|объявлений', 'listings'),
        names: own.slice(0, 8).map(c => c.title),
        result: T(`${own.length} ${plw(own.length, 'объявление|объявления|объявлений')} из чатов и Marketplace по району`, `${own.length} listings from chats and Marketplace in the area`),
      })
    }
    const vals = m.comps.map(c => c.rentMonthUsd).filter(v => v > 0)
    const lo = Math.floor(Math.min(...vals) * 0.9), hi = Math.ceil(Math.max(...vals) * 1.1)
    out.push({
      id: 'monthly', group: G.money, title: T('Сдавать надолго', 'Long-term rental'),
      sub: T(`Сколько просят за месяц и год за похожие ${VA('виллы', 'апартаменты')}`, `Monthly and yearly asking rents for similar ${VA('villas', 'apartments')}`),
      sources,
      vizs: vals.length >= 3 ? [{ kind: 'strip', title: T(`Аренда на месяц: похожие ${VA('виллы', 'апартаменты')}`, `Monthly rent: similar ${VA('villas', 'apartments')}`), points: vals, lo, hi, mark: { value: m.p50, label: T(`середина ${usd(m.p50)}`, `median ${usd(m.p50)}`) }, loLabel: usd(lo), hiLabel: usd(hi) }] : [],
      bigs: [{ v: usd(m.p50), l: T('в месяц — середина рынка', 'a month, market median') }, { v: num(m.n), l: T('объявлений в сравнении', 'listings compared') }],
      meaning: T(`если сдавать на год, ориентир — около ${usd(m.p50)} в месяц за ${VA('похожую виллу', 'похожие апартаменты')}.`, `for a yearly lease, expect about ${usd(m.p50)} a month for a similar ${VA('villa', 'apartment')}.`),
      footnote: T('Годовые цены пересчитаны в месяц.', 'Yearly prices converted to monthly.'),
    })
  }

  // ── Не переплатить ─────────────────────────────────────────────────
  const s = i.sale
  if (s && s.n > 0 && s.median != null) {
    const perYear = s.metric === 'year'
    const unitLbl = perYear ? T('за м² на год аренды', 'per m² per lease year') : T('за м²', 'per m²')
    const val = (c: SaleCompsBundle['comps'][number]) => (perYear ? c.ppmYear : c.ppm)
    const pts = s.comps.map(val).filter((x): x is number => x != null)
    const fmt = (v: number) => usd(perYear ? Math.round(v * 10) / 10 : v)
    const sources: Source[] = [{
      name: s.catalogN > 0 ? T('rumah123 и каталог Balinsky', 'rumah123 & Balinsky catalog') : 'rumah123', fresh: T('объявления о продаже', 'for-sale listings'),
      chips: [dist(s.radiusKm), i.bedrooms ? T(`${i.bedrooms} спальни`, `${i.bedrooms} bedrooms`) : T('похожие', 'similar'), T('продажа', 'for sale'), unitLbl],
      total: s.n, unit: T('объявление|объявления|объявлений', 'listings'),
      names: s.comps.slice(0, 12).map(c => c.name ?? c.district ?? 'Villa'),
      result: T(`${s.n} похожих на продаже → середина ${fmt(s.median)} (${unitLbl})`, `${s.n} similar for sale → median ${fmt(s.median)} (${unitLbl})`),
      items: s.comps.filter(c => c.photo).slice(0, 8).map(c => ({ photo: c.photo, name: c.name ?? (c.district ?? 'Villa'), url: c.url, meta: [usd(c.priceUsd), dist(c.distanceKm)].join(' · ') })),
    }]
    const diff = s.diffPct
    const lo = pts.length ? Math.min(...pts, s.self ?? Infinity) * 0.9 : s.median * 0.5
    const hi = pts.length ? Math.max(...pts, s.self ?? 0) * 1.1 : s.median * 1.5
    out.push({
      id: 'price', group: G.money, title: T('Не переплатить', 'Don’t overpay'),
      sub: T('Цена этой виллы против похожих на продаже рядом', 'This villa’s price against similar ones for sale nearby'),
      sources,
      vizs: [{ kind: 'strip', title: T(`Похожие на продаже, ${unitLbl}`, `Similar for sale, ${unitLbl}`), points: pts, lo, hi, mark: { value: s.median, label: T('середина', 'median') }, self: s.self != null ? { value: s.self, label: T('эта вилла', 'this villa') } : null, loLabel: fmt(lo), hiLabel: fmt(hi) }],
      bigs: [
        ...(diff != null ? [{ v: `${diff > 0 ? '+' : ''}${Math.round(diff)}%`, l: diff > 0 ? T('дороже середины рынка', 'above market median') : T('дешевле середины рынка', 'below market median') }] : []),
        { v: fmt(s.median), l: T(`середина рынка, ${unitLbl}`, `market median, ${unitLbl}`) },
      ],
      meaning: diff == null ? T('видно, где эта вилла среди похожих на продаже.', 'shows where this villa sits among similar listings.')
        : Math.abs(diff) < 10 ? T('цена в середине рынка — без явной переплаты.', 'priced around the market median — no obvious overpay.')
        : diff > 0 ? T(`эта вилла дороже большинства похожих на ${Math.round(diff)}%. Есть повод обсудить цену или понять, за что доплата.`, `this villa is ${Math.round(diff)}% above most similar ones — worth negotiating or understanding the premium.`)
        : T(`эта вилла дешевле похожих на ${Math.round(-diff)}% — стоит понять почему.`, `this villa is ${Math.round(-diff)}% below similar ones — worth finding out why.`),
      footnote: perYear ? T('Сравниваем цену за м² на год аренды земли — так честно сравнить виллы с разным сроком.', 'We compare price per m² per lease year so villas with different lease terms are comparable.') : undefined,
    })
  }

  // ── Проверить документы ────────────────────────────────────────────
  const checks: { state: 'ok' | 'warn' | 'info'; label: string; value: string }[] = []
  const year = i.yearRaw && /^\d{4}$/.test(i.yearRaw.trim()) ? Number(i.yearRaw.trim()) : null
  const built = !!i.status && /построен|ready|completed|сдан/i.test(i.status)
  if (i.status) checks.push({ state: built ? 'ok' : 'info', label: T('Стройка', 'Construction'), value: built ? T(year ? `завершена в ${year}` : 'завершена', year ? `completed in ${year}` : 'completed') : i.status })
  const nowYear = new Date().getFullYear()
  if (i.leaseYears != null) checks.push({ state: i.leaseYears >= 20 ? 'ok' : 'warn', label: T('Аренда земли', 'Land lease'), value: T(`${Math.round(i.leaseYears)} лет`, `${Math.round(i.leaseYears)} years`) })
  if (i.permit) {
    const slfDone = /^(SLF|PBG и SLF|есть SLF)/i.test(i.permit) && !/заявк/i.test(i.permit)
    checks.push({ state: slfDone ? 'ok' : 'warn', label: T('Разрешения', 'Permits'), value: i.permit })
  }
  const plot = i.rdtr ? plotLabel(i.rdtr.data, i.lang) : null
  if (plot) checks.push({ state: 'ok', label: T('Зона участка', 'Plot zone'), value: plot.label })
  if (checks.length >= 2) {
    const warn = checks.find(c => c.state === 'warn')
    const sources: Source[] = [{
      name: T('Проверка Balinsky', 'Balinsky check'), fresh: T('документы застройщика', 'developer documents'),
      chips: [T('разрешения', 'permits'), T('аренда земли', 'land lease'), T('статус стройки', 'construction')],
      total: checks.length, unit: T('пункт|пункта|пунктов', 'items'),
      names: checks.map(c => `${c.label} — ${c.value}`),
      result: checks.filter(c => c.label !== T('Зона участка', 'Plot zone')).map(c => `${c.label}: ${c.value}`).join(' · '),
    }]
    if (i.rdtr?.data.plot) {
      const p = i.rdtr.data.plot
      const kdb = rule(p.kdb, '%'), kdh = rule(p.kdh, '%')
      sources.push({
        name: T('Госплан зон (GISTARU)', 'Zoning plan (GISTARU)'), fresh: i.rdtr.data.fetchedAt ? T(`данные на ${d8(i.rdtr.data.fetchedAt)}`, `as of ${d8(i.rdtr.data.fetchedAt)}`) : 'ATR/BPN',
        chips: [T('зона участка', 'plot zone'), T('что можно строить', 'what can be built')],
        total: 1, unit: T('участок|участка|участков', 'plot'),
        names: [plot?.label ?? p.name ?? '', kdb ? T(`застройка до ${kdb.text}`, `coverage up to ${kdb.text}`) : '', kdh ? T(`зелень от ${kdh.text}`, `green at least ${kdh.text}`) : ''].filter(Boolean),
        result: [plot?.label, kdb ? T(`застройка до ${kdb.text}`, `coverage up to ${kdb.text}`) : null, kdh ? T(`зелень от ${kdh.text}`, `green at least ${kdh.text}`) : null].filter(Boolean).join(' · '),
      })
    }
    const vizs: Viz[] = [{ kind: 'checks', title: T('Что проверили', 'What we checked'), rows: checks }]
    if (i.leaseYears != null && i.leaseYears > 0) {
      const start = year ?? nowYear
      const end = Math.round(start + i.leaseYears)
      vizs.push({ kind: 'strip', title: T('Аренда земли: сколько осталось', 'Land lease: time left'), points: [], lo: start, hi: end, mark: { value: Math.min(Math.max(nowYear, start), end), label: T('сейчас', 'now') }, loLabel: String(start), hiLabel: String(end), note: T(`Осталось около ${Math.max(0, end - nowYear)} лет`, `About ${Math.max(0, end - nowYear)} years left`) })
    }
    out.push({
      id: 'docs', group: G.docs, title: T('Проверить документы', 'Check documents'),
      sub: T('Разрешения, аренда земли, статус стройки, зона участка', 'Permits, land lease, construction status, plot zone'),
      sources, vizs,
      bigs: [...(i.leaseYears != null ? [{ v: T(`${Math.round(i.leaseYears)} лет`, `${Math.round(i.leaseYears)} yrs`), l: T('аренда земли', 'land lease') }] : []), { v: `${checks.filter(c => c.state === 'ok').length}/${checks.length}`, l: T('пунктов в порядке', 'items in order') }],
      meaning: warn ? T(`есть пункт, который стоит уточнить до оплаты: ${warn.label.toLowerCase()} — ${warn.value}.`, `one item to clarify before paying: ${warn.label.toLowerCase()} — ${warn.value}.`) : T('по документам, которые мы видели, вопросов нет.', 'no issues in the documents we have seen.'),
      footnote: T('Проверка по документам застройщика. Вопросы к договору — после заявки.', 'Based on developer documents. Contract questions — after a request.'),
    })
  }

  // ── Оценить землю ──────────────────────────────────────────────────
  const lp = i.landPrices
  if (lp && i.landM2 && i.landM2 > 0) {
    const value = lp.medianPpm * i.landM2
    const comps = lp.comps ?? []
    const share = i.priceUsd ? Math.round((value / i.priceUsd) * 100) : null
    const pts = comps.map(c => c.ppm)
    const lo = pts.length ? Math.min(...pts, lp.p25) * 0.9 : lp.p25 * 0.8
    const hi = pts.length ? Math.max(...pts, lp.p75) * 1.1 : lp.p75 * 1.2
    const adj = lp.method === 'freehold_adjusted'
    out.push({
      id: 'landValue', group: G.docs, title: T('Оценить землю', 'Value the land'),
      sub: T('Сколько стоит участок под виллой по ценам земли рядом', 'What the plot is worth at nearby land prices'),
      sources: [{
        name: T('Участки на продаже', 'Plots for sale'), fresh: T('rumah123 и ещё 4 сайта', 'rumah123 and 4 more sites'),
        chips: [dist(lp.radiusKm), adj ? T('в собственность → аренда', 'freehold → leasehold') : T('в аренду', 'leasehold'), T('цена за м²', 'price per m²')],
        total: lp.scanned && lp.scanned > lp.n ? lp.scanned : lp.n, unit: T('участок|участка|участков', 'plots'),
        names: comps.slice(0, 14).map(c => `${c.district ?? T('участок', 'plot')} · ${num(c.landM2)} ${T('м²', 'm²')} — ${usd(c.ppm)}/${T('м²', 'm²')}`),
        result: T(`${lp.n} ${plw(lp.n, 'участок|участка|участков')} в ${dist(lp.radiusKm)} → середина ${usd(lp.medianPpm)} за м² (от ${usd(lp.p25)} до ${usd(lp.p75)})`, `${lp.n} plots within ${dist(lp.radiusKm)} → median ${usd(lp.medianPpm)} per m² (${usd(lp.p25)}–${usd(lp.p75)})`),
        items: comps.slice(0, 8).map(c => ({ photo: null, name: `${c.district ?? T('Участок', 'Plot')} · ${num(c.landM2)} ${T('м²', 'm²')}`, url: c.url || null, meta: `${usd(c.priceUsd)} · ${dist(c.distanceKm)}` })),
      }],
      vizs: [
        { kind: 'strip', title: T('Цена земли рядом, за м²', 'Nearby land price per m²'), points: pts, lo, hi, mark: { value: lp.medianPpm, label: T('середина', 'median') }, loLabel: usd(lo), hiLabel: usd(hi), note: T(`Половина участков — от ${usd(lp.p25)} до ${usd(lp.p75)} за м²`, `Half of the plots are ${usd(lp.p25)}–${usd(lp.p75)} per m²`) },
        ...(share != null && i.priceUsd ? [{ kind: 'bars' as const, title: T('Из чего складывается цена виллы', 'What the villa price is made of'), max: i.priceUsd, rows: [{ label: T('Земля', 'Land'), value: Math.min(value, i.priceUsd), text: `${share}%` }, { label: T('Дом и отделка', 'House & finish'), value: Math.max(0, i.priceUsd - value), text: `${Math.max(0, 100 - share)}%` }] }] : []),
      ],
      bigs: [{ v: `≈ ${usd(value)}`, l: T(`стоит участок ${num(i.landM2)} м²`, `for the ${num(i.landM2)} m² plot`) }, ...(share != null ? [{ v: `${share}%`, l: T('цены виллы — это земля', 'of the villa price is land') }] : [])],
      meaning: share == null ? T(`земля под виллой стоит около ${usd(value)}.`, `the land under the villa is worth about ${usd(value)}.`)
        : share >= 60 ? T(`большая часть цены — земля (${share}%). Дом стоит недорого относительно участка.`, `most of the price is land (${share}%) — the house itself is cheap relative to the plot.`)
        : T(`земля — ${share}% цены, остальное — дом и отделка. Так видно, за что вы платите.`, `land is ${share}% of the price, the rest is the house and finish — this shows what you pay for.`),
      footnote: adj ? T('Рядом мало участков в аренду — взяли участки в собственность и пересчитали на аренду (×0,35).', 'Few leasehold plots nearby — freehold prices converted to leasehold (×0.35).') : T('Сравниваем с участками в аренду (лизхолд), как у этой виллы.', 'Compared with leasehold plots, like this villa.'),
    })
  }

  // ── Проверить участок ──────────────────────────────────────────────
  const cl = i.geo?.climate ?? null
  const pl = cl?.plot ?? null
  const hz = cl?.hazards ?? null
  const sea = cl?.sea ?? null
  const bld = cl?.buildings ?? null
  if (i.rdtr || pl || hz) {
    const sources: Source[] = []
    const vizs: Viz[] = []
    const rows = i.rdtr ? zoneRows(i.rdtr.data, i.lang) : []
    if (i.rdtr && rows.length) {
      sources.push({
        name: T('Госплан зон (GISTARU)', 'Zoning plan (GISTARU)'), fresh: i.rdtr.data.fetchedAt ? T(`данные на ${d8(i.rdtr.data.fetchedAt)}`, `as of ${d8(i.rdtr.data.fetchedAt)}`) : 'ATR/BPN',
        chips: [T('участок', 'plot'), T('зона', 'zone'), T(`${i.rdtr.data.radius} м вокруг`, `${i.rdtr.data.radius} m around`)],
        total: i.rdtr.data.zones.length, unit: T('зона|зоны|зон', 'zones'),
        names: rows.map(r => `${r.label} — ${Math.round(r.share * 100)}%`),
        result: [plot ? T(`Участок: ${plot.label}`, `Plot: ${plot.label}`) : null, T(`вокруг ${rows.slice(0, 2).map(r => `${r.label.toLowerCase()} ${Math.round(r.share * 100)}%`).join(', ')}`, `around: ${rows.slice(0, 2).map(r => `${r.label.toLowerCase()} ${Math.round(r.share * 100)}%`).join(', ')}`)].filter(Boolean).join(' · '),
      })
      // Живая карта: спутник Esri и поверх — сами зоны госплана в их цветах.
      const rd = i.rdtr.data
      const [cLng, cLat] = rd.center
      const mpp = (2.1 * rd.radius) / 960
      const zoom = Math.max(14, Math.min(18, Math.round(Math.log2((156543.03392 * Math.cos((cLat * Math.PI) / 180)) / mpp))))
      const r6 = (n: number) => Math.round(n * 1e6) / 1e6
      const polys = rd.zones.flatMap(z => {
        const g = z.geometry
        const polysOf = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []
        return polysOf.map(rings => ({ color: z.color, rings: rings.map(r => r.map(([x, y]) => [r6(x), r6(y)])) }))
      })
      vizs.push({ kind: 'map', title: T(`Зоны госплана, ${rd.radius} м вокруг`, `Zoning plan, ${rd.radius} m around`), center: { lat: cLat, lng: cLng }, zoom, aspect: 1, base: 'sat',
        polys, rings: [{ m: rd.radius, label: rd.radius >= 1000 ? `${rd.radius / 1000} ${T('км', 'km')}` : `${rd.radius} ${T('м', 'm')}` }],
        pins: center ? [{ ...center, color: '#0F1A15' }] : [], tags: center ? [{ ...center, label: T('Участок', 'Plot') }] : [],
        credit: 'GISTARU ATR/BPN · Esri', alt: T('Спутниковая карта с цветами зон госплана', 'Satellite map with zoning colours'),
        legend: rows.slice(0, 7).map(r => ({ color: r.color, label: `${r.label} ${Math.round(r.share * 100)}%` })) })
    }
    // Что можно построить на участке: доля застройки, зелень, площадь всех этажей.
    const pr = i.rdtr?.data.plot
    const kdb = pr ? rule(pr.kdb, '%') : null, kdh = pr ? rule(pr.kdh, '%') : null, klb = pr ? rule(pr.klb, '') : null
    const plotKind = pr?.name ? zoneKind(pr.name) : null
    if (pr && (kdb || kdh || klb)) {
      const m2 = i.landM2 && i.landM2 > 0 ? i.landM2 : null
      const sq = (k: number) => `${num(Math.round(m2! * k))} ${T('м²', 'm²')}`
      const ruleRows: Extract<Viz, { kind: 'checks' }>['rows'] = []
      if (plot) ruleRows.push({ state: plotKind?.group === 'nobuild' ? 'warn' : 'ok', label: T('Зона участка', 'Plot zone'), value: plotKind?.group === 'nobuild' ? T(`${plot.label} — жильё обычно не строят`, `${plot.label} — housing usually not allowed`) : plot.label })
      if (kdb) ruleRows.push({ state: 'ok', label: T(`Под зданием — до ${kdb.text} участка`, `Building footprint — up to ${kdb.text}`), value: m2 ? T(`до ${sq(kdb.hi / 100)}`, `up to ${sq(kdb.hi / 100)}`) : '' })
      if (kdh) ruleRows.push({ state: 'ok', label: T(`Зелень — от ${kdh.text} участка`, `Green area — at least ${kdh.text}`), value: m2 ? T(`от ${sq(kdh.lo / 100)}`, `at least ${sq(kdh.lo / 100)}`) : '' })
      if (klb) ruleRows.push({ state: 'ok', label: T(`Площадь всех этажей — до ${klb.text}× участка`, `All floors together — up to ${klb.text}× the plot`), value: m2 ? T(`до ${sq(klb.hi)}`, `up to ${sq(klb.hi)}`) : '' })
      vizs.unshift({ kind: 'checks', title: T(m2 ? `Что можно построить на участке ${num(m2)} м²` : 'Что можно построить по госплану', m2 ? `What can be built on the ${num(m2)} m² plot` : 'What the zoning plan allows'), rows: ruleRows })
      sources.push({
        name: T('Правила зоны (RDTR)', 'Zone rules (RDTR)'), fresh: rd8(i.rdtr!.data.regulation),
        chips: [T('застройка', 'coverage'), T('зелень', 'green'), T('этажность', 'floor area')],
        total: ruleRows.length, unit: T('правило|правила|правил', 'rules'),
        names: ruleRows.map(r => `${r.label}${r.value ? ` — ${r.value}` : ''}`),
        result: [kdb ? T(`застройка до ${kdb.text}`, `coverage up to ${kdb.text}`) : null, kdh ? T(`зелень от ${kdh.text}`, `green at least ${kdh.text}`) : null, klb ? T(`все этажи до ${klb.text}× участка`, `floor area up to ${klb.text}×`) : null].filter(Boolean).join(' · '),
      })
    }
    if (pl) {
      const ns: string[] = []
      if (pl.slope_pct != null) ns.push(T(`уклон — ${pl.slope_pct.toFixed(1).replace('.', ',')}%`, `slope — ${pl.slope_pct.toFixed(1)}%`))
      ns.push(`${pl.road.name ?? T('дорога', 'road')} — ${Math.round(pl.road.m)} ${T('м', 'm')}`)
      ns.push(T(`море — ${num(pl.coast_m)} м`, `sea — ${num(pl.coast_m)} m`))
      ns.push(T(`река — ${num(pl.river_m)} м`, `river — ${num(pl.river_m)} m`))
      sources.push({
        name: T('Карта высот и OpenStreetMap', 'Elevation map & OpenStreetMap'), fresh: 'Copernicus DEM',
        chips: [T('уклон', 'slope'), T('дорога', 'road'), T('море', 'sea'), T('река', 'river')],
        total: 4, unit: T('замер|замера|замеров', 'checks'), names: ns,
        result: [pl.slope_pct != null ? (pl.slope_pct < 5 ? T(`Ровный участок (уклон ${pl.slope_pct.toFixed(1).replace('.', ',')}%)`, `Flat plot (slope ${pl.slope_pct.toFixed(1)}%)`) : T(`Уклон ${pl.slope_pct.toFixed(1).replace('.', ',')}%`, `Slope ${pl.slope_pct.toFixed(1)}%`)) : null, T(`дорога в ${Math.round(pl.road.m)} м`, `road ${Math.round(pl.road.m)} m away`), T(`до моря ${num(pl.coast_m)} м`, `${num(pl.coast_m)} m to the sea`)].filter(Boolean).join(' · '),
      })
    }
    if (hz) {
      const names: Record<string, [string, string]> = { flood: ['наводнение', 'flood'], tsunami: ['цунами', 'tsunami'], landslide: ['оползень', 'landslide'], volcano: ['вулкан', 'volcano'], flash_flood: ['сель', 'flash flood'], earthquake: ['землетрясение', 'earthquake'] }
      const keys = Object.keys(names) as (keyof typeof names)[]
      const flagged = keys.filter(k => k !== 'earthquake' && (hz as Record<string, number | null>)[k] != null)
      sources.push({
        name: 'InaRISK (BNPB)', fresh: T('гос. карта рисков', 'government hazard map'),
        chips: keys.slice(0, 4).map(k => T(names[k][0], names[k][1])),
        total: keys.length, unit: T('риск|риска|рисков', 'hazards'),
        names: keys.map(k => { const v = (hz as Record<string, number | null>)[k]; return `${T(names[k][0], names[k][1])} — ${v == null ? T('не отмечено', 'not flagged') : v.toFixed(2).replace('.', ru ? ',' : '.')}` }),
        result: flagged.length ? T(`Отмечено: ${flagged.map(k => names[k][0]).join(', ')}`, `Flagged: ${flagged.map(k => names[k][1]).join(', ')}`) : T('Наводнение, цунами, оползни, вулкан — не отмечены', 'Flood, tsunami, landslide, volcano — not flagged'),
      })
    }
    if (sea) {
      sources.push({
        name: T('Copernicus: море к 2050', 'Copernicus: sea by 2050'), fresh: T('прогноз C3S', 'C3S projection'),
        chips: [T('высота', 'elevation'), T('шторм раз в 100 лет', '100-year storm'), '2050'],
        total: 30, unit: T('лет прогноза', 'years ahead'),
        names: [T(`высота участка — ${dec(sea.elevation_m)} м`, `plot elevation — ${dec(sea.elevation_m)} m`), T(`вода к 2050 — ${dec(sea.twl100_2021_2050)} м`, `water by 2050 — ${dec(sea.twl100_2021_2050)} m`)],
        result: T(`Участок на ${dec(sea.elevation_m)} м, самая высокая вода к 2050 — ${dec(sea.twl100_2021_2050)} м · запас ${dec(sea.margin_m)} м`, `Plot at ${dec(sea.elevation_m)} m, highest water by 2050 — ${dec(sea.twl100_2021_2050)} m · margin ${dec(sea.margin_m)} m`),
      })
    }
    const yrs = bld ? Object.entries(bld.years).sort(([a], [b]) => a.localeCompare(b)) : []
    if (yrs.length >= 2) {
      const first = yrs[0], last = yrs[yrs.length - 1]
      const growth = Math.round((last[1].n / first[1].n - 1) * 100)
      sources.push({
        name: 'Google Open Buildings', fresh: T(`снимки ${first[0]}–${last[0]}`, `imagery ${first[0]}–${last[0]}`),
        chips: [T(`${bld!.radius_m / 1000} км вокруг`, `${bld!.radius_m / 1000} km around`), T('здания по годам', 'buildings by year')],
        total: last[1].n, unit: T('здание|здания|зданий', 'buildings'),
        names: yrs.map(([y, v]) => `${y} — ${num(v.n)}`),
        result: T(`${num(first[1].n)} ${plw(first[1].n, 'здание|здания|зданий')} в ${first[0]} → ${num(last[1].n)} в ${last[0]} (${growth > 0 ? '+' : ''}${growth}%)`, `${num(first[1].n)} buildings in ${first[0]} → ${num(last[1].n)} in ${last[0]} (${growth > 0 ? '+' : ''}${growth}%)`),
      })
      const mx = Math.max(...yrs.map(([, v]) => v.n))
      vizs.push({ kind: 'cols', title: T(`Зданий в радиусе ${bld!.radius_m / 1000} км по годам`, `Buildings within ${bld!.radius_m / 1000} km by year`), max: mx, cols: yrs.map(([y, v]) => ({ label: y.slice(2), value: v.n, text: (v.n / 1000).toFixed(1).replace('.', ru ? ',' : '.') + 'k' })) })
    }
    if (sources.length) {
      const flat = pl?.slope_pct != null && pl.slope_pct < 5
      const noHz = hz && !['flood', 'tsunami', 'landslide', 'volcano'].some(k => (hz as Record<string, number | null>)[k] != null)
      out.push({
        id: 'land', group: G.docs, title: T('Проверить участок', 'Check the plot'),
        sub: T('Зона по госплану, что можно построить, уклон, дорога, природные риски', 'Zoning, what can be built, slope, road, natural hazards'),
        sources, vizs,
        bigs: [...(plot ? [{ v: plot.label.split('·').pop()!.trim(), l: plot.label.split('·')[0].trim() }] : []), ...(sea ? [{ v: `${dec(sea.margin_m)} ${T('м', 'm')}`, l: T('запас над водой к 2050', 'margin above water by 2050') }] : pl ? [{ v: `${num(pl.coast_m)} ${T('м', 'm')}`, l: T('до моря', 'to the sea') }] : [])],
        meaning: [kdb && i.landM2 ? T(`на участке можно застроить до ${num(Math.round(i.landM2 * kdb.hi / 100))} м²`, `up to ${num(Math.round(i.landM2 * kdb.hi / 100))} m² of the plot can be built on`) : null, flat ? T('участок ровный', 'the plot is flat') : null, pl ? T(`дорога в ${Math.round(pl.road.m)} м`, `road ${Math.round(pl.road.m)} m away`) : null, noHz ? T('госкарта не отмечает тут ни наводнений, ни цунами', 'the government map flags no flood or tsunami here') : null].filter(Boolean).join(', ') + '.',
      })
    }
  }

  // ── Что рядом ──────────────────────────────────────────────────────
  if (i.nearby && center) {
    const cats = i.nearby.categories.filter(c => (i.nearby!.byCategory[c.key]?.length ?? 0) > 0)
    const all = cats.flatMap(c => i.nearby!.byCategory[c.key].map(p => ({ ...p, cat: c.key })))
    if (all.length >= 5) {
      const near = [...all].sort((a, b) => a.distanceKm - b.distanceKm)
      const colorOf = (k: string) => (k === 'beach' || k === 'beachclub' ? BLUE : k === 'restaurant' || k === 'cafe' || k === 'nightlife' ? GREEN : k === 'school' || k === 'international_school' || k === 'preschool' ? PURPLE : k === 'hospital' || k === 'pharmacy' ? '#C9443A' : ORANGE)
      const inMap = near.filter(p => p.distanceKm <= 2.05)
      const best = (k: string) => i.nearby!.byCategory[k]?.slice().sort((a, b) => a.distanceKm - b.distanceKm)[0]
      const tags = (['beach'] as const).map(k => ({ k, p: best(k) })).filter(x => x.p && x.p.distanceKm <= 2)
      const catTitle = (c: NearbyCategory) => (ru ? c.title : ({ beach: 'Beaches', restaurant: 'Restaurants', cafe: 'Cafés', nightlife: 'Bars & clubs', attraction: 'Sights', school: 'Schools', preschool: 'Kindergartens', supermarket: 'Shops', pharmacy: 'Pharmacies', hospital: 'Clinics', shopping_mall: 'Malls', ferry_terminal: 'Ports', wellness: 'Yoga & fitness', beachclub: 'Beach clubs', international_school: 'Intl schools', coworking: 'Coworkings' } as Record<string, string>)[c.key] ?? c.title)
      const BUCKET: Record<string, [string, string]> = { restaurant: ['Рестораны', 'Restaurants'], cafe: ['Кафе', 'Cafés'], bar: ['Бары', 'Bars'], hotel: ['Отели', 'Hotels'], shopping: ['Магазины', 'Shops'], spa: ['Спа', 'Spas'], fitness: ['Фитнес', 'Fitness'], beach: ['Пляжи', 'Beaches'], beach_club: ['Beach clubs', 'Beach clubs'], attraction: ['Достопримечательности', 'Sights'], kids_fun: ['Для детей', 'Kids'], health: ['Клиники', 'Clinics'], school: ['Школы', 'Schools'], temple: ['Храмы', 'Temples'], coworking: ['Коворкинги', 'Coworkings'] }
      const r1 = i.around1km
      const counts = r1 ? Object.entries(r1).filter(([, n]) => n > 0).map(([k, n]) => ({ label: T(BUCKET[k]?.[0] ?? k, BUCKET[k]?.[1] ?? k), n })).sort((a, b) => b.n - a.n) : []
      const totalNear = r1 ? counts.reduce((x, y) => x + y.n, 0) : 0
      const NEARMAP: Viz = { kind: 'map', title: T('Карта: что рядом — 100 м, 500 м, 1 км, 2 км', 'Map: what’s nearby — 100 m, 500 m, 1 km, 2 km'), center, zoom: 15, aspect: 1, base: 'street',
            rings: [100, 500, 1000, 2000].map(m => ({ m, label: m < 1000 ? `${m} ${T('м', 'm')}` : `${m / 1000} ${T('км', 'km')}` })), credit: 'Esri, Google Maps', alt: T(`Карта мест рядом с ${VA('виллой', 'апартаментами')}`, `Map of places near the ${VA('villa', 'apartment')}`),
            pins: [...inMap.map(p => ({ lat: p.lat, lng: p.lng, color: colorOf(p.cat) })), { ...center, color: '#0F1A15' }],
            tags: tags.map(({ p }) => ({ lat: p!.lat, lng: p!.lng, label: `${p!.name?.slice(0, 22)} · ${dist(p!.distanceKm)}` })),
            legend: [{ color: GREEN, label: T('Еда и бары', 'Food & bars') }, { color: BLUE, label: T('Пляж', 'Beach') }, { color: PURPLE, label: T('Школы', 'Schools') }, { color: '#C9443A', label: T('Здоровье', 'Health') }, { color: ORANGE, label: T('Другое', 'Other') }, { color: '#0F1A15', label: T(VA('Эта вилла', 'Эти апартаменты'), VA('This villa', 'This apartment')) }] }
      out.push({
        id: 'nearby', group: G.place, title: T('Что рядом', 'What’s nearby'),
        sub: T('Пляжи, кафе, магазины, школы, клиники', 'Beaches, cafés, shops, schools, clinics'),
        sources: [{
          name: 'Google Maps', fresh: T('места с отзывами', 'places with reviews'),
          chips: cats.slice(0, 5).map(c => catTitle(c).toLowerCase()),
          total: totalNear || near.filter(p => p.distanceKm <= 1).length, unit: T('место|места|мест', 'places'),
          names: near.slice(0, 14).map(p => `${p.name} — ${dist(p.distanceKm)}${p.rating ? ` ★${p.rating}` : ''}`),
          live: NEARMAP,
          items: [...i.aroundTop].filter(v => v.dist_m != null).sort((a, b) => (a.dist_m ?? 0) - (b.dist_m ?? 0)).slice(0, 10).map(v => ({
            photo: v.photo_url ? cdnRewrite(v.photo_url) : null,
            name: `${v.name ?? ''} · ${dist((v.dist_m ?? 0) / 1000)}`,
            url: null,
            meta: [v.type, v.rating ? `★ ${v.rating}` : null, v.reviews ? `${num(v.reviews)} ${T('отзывов', 'reviews')}` : null].filter(Boolean).join(' · '),
          })),
          result: totalNear ? T(`${totalNear} ${plw(totalNear, 'место|места|мест')} с хорошими отзывами в 1 км: `, `${totalNear} well-reviewed places within 1 km: `) + counts.slice(0, 4).map(x => `${x.label.toLowerCase()} ${x.n}`).join(', ') : T('Ближайшие места — на карте', 'Nearest places are on the map'),
        }],
        vizs: [
          ...(counts.length ? [{ kind: 'bars' as const, title: T('Места с хорошими отзывами в 1 км', 'Well-reviewed places within 1 km'), max: counts[0].n, rows: counts.slice(0, 8).map(x => ({ label: x.label, value: x.n, text: String(x.n) })) }] : []),
        ],
        bigs: [...(totalNear ? [{ v: num(totalNear), l: T('мест в 1 км', 'places within 1 km') }] : []), ...(best('beach') ? [{ v: dist(best('beach')!.distanceKm), l: T('до пляжа', 'to the beach') }] : [])],
        meaning: best('beach') && best('beach')!.distanceKm <= 1.5 ? T('пляж и кафе — пешком, гостям не нужен байк.', 'the beach and cafés are walkable — guests don’t need a scooter.') : T('всё нужное рядом, но до пляжа — на транспорте.', 'daily needs are close, the beach needs transport.'),
        footnote: 'Google Maps.',
      })
    }
  }

  // ── Уровень туризма ────────────────────────────────────────────────
  const tz = i.tourism
  if (tz && center) {
    const ta10 = tz.ta.filter(p => p.km <= 10)
    const lm = [...i.landmarks].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 8)
    const sources: Source[] = [{
      name: T('Тепловая карта туристов', 'Tourist heat map'), fresh: T('отзывы иностранцев в Google', 'foreign reviews on Google'),
      chips: [T('1 км вокруг', '1 km around'), T('отзывы туристов', 'tourist reviews'), T('весь Бали', 'all of Bali')],
      total: tz.cells.length, unit: T('квартал|квартала|кварталов', 'blocks'),
      names: [T(`уровень здесь — ${tz.percentile} из 100`, `level here — ${tz.percentile} of 100`), ...(i.touristShare != null ? [T(`заведения для иностранцев — ${Math.round(i.touristShare)}%`, `foreigner-facing venues — ${Math.round(i.touristShare)}%`)] : [])],
      result: T(`Туристов больше, чем в ${tz.percentile}% туристических мест Бали`, `More tourists than ${tz.percentile}% of tourist spots on Bali`) + (i.touristShare != null ? T(` · ${Math.round(i.touristShare)}% заведений рядом — для иностранцев`, ` · ${Math.round(i.touristShare)}% of venues nearby cater to foreigners`) : ''),
      live: { kind: 'map', title: T('Где туристы — тепловая карта, 1 и 2 км', 'Where tourists are — heat map, 1 and 2 km'), center, zoom: 14, aspect: 1, base: 'street', credit: 'Esri, Google Maps',
        alt: T(`Тепловая карта туристов вокруг ${VA('виллы', 'апартаментов')}`, `Tourist heat map around the ${VA('villa', 'apartment')}`), heat: tz.cells.map(c => ({ lat: c.lat, lng: c.lng, w: c.weight })), heatMax: tz.heatMax,
        rings: [1000, 2000].map(m => ({ m, label: `${m / 1000} ${T('км', 'km')}` })), pins: [{ ...center, color: '#0F1A15' }] },
    }]
    if (tz.ta.length) {
      const near = tz.ta[0]
      sources.push({
        name: 'TripAdvisor', fresh: T(`топ‑90 Бали, снимок ${tz.taSnapshot}`, `Bali top 90, ${tz.taSnapshot}`),
        chips: [T('топ‑90 Бали', 'Bali top 90'), T('до 10 км', 'within 10 km')],
        total: tz.ta.length, unit: T('место|места|мест', 'places'),
        names: tz.ta.slice(0, 14).map(p => `#${p.rank} ${p.name} — ${trip(`ta:${p.rank}`, p.km)}`),
        result: T(`В 10 км — ${ta10.length} ${plw(ta10.length, 'место|места|мест')} из топа TripAdvisor · ближайшее: ${near.name} (#${near.rank}), ${trip(`ta:${near.rank}`, near.km)}`, `${ta10.length} TripAdvisor top places within 10 km · nearest: ${near.name} (#${near.rank}), ${trip(`ta:${near.rank}`, near.km)}`),
        items: ta10.slice(0, 8).map(p => ({ photo: p.photo ? cdnRewrite(p.photo) : null, name: `#${p.rank} ${p.name} · ${trip(`ta:${p.rank}`, p.km)}`, url: null, meta: T(`№${p.rank} в топе TripAdvisor`, `#${p.rank} on TripAdvisor`) })),
      })
    }
    if (lm.length) {
      sources.push({
        name: T('Что посмотреть рядом', 'What to see nearby'), fresh: T('Google Maps, от 800 отзывов', 'Google Maps, 800+ reviews'),
        chips: [T('достопримечательности', 'sights'), T('храмы', 'temples'), T('для детей', 'kids')],
        total: lm.length, unit: T('место|места|мест', 'places'),
        names: lm.map(l => `${l.name} — ${trip(`lm:${l.id}`, l.distanceKm)}`),
        result: T(`Рядом: ${lm.slice(0, 3).map(l => `${l.name} (${trip(`lm:${l.id}`, l.distanceKm)})`).join(', ')}`, `Nearby: ${lm.slice(0, 3).map(l => `${l.name} (${trip(`lm:${l.id}`, l.distanceKm)})`).join(', ')}`),
        items: lm.map(l => ({ photo: l.photo ? cdnRewrite(l.photo) : null, name: `${l.name} · ${trip(`lm:${l.id}`, l.distanceKm)}`, url: l.mapsUrl, meta: [l.taRank ? `#${l.taRank} TripAdvisor` : null, l.rating ? `★ ${l.rating}` : null, `${num(l.reviews)} ${T('отзывов', 'reviews')}`].filter(Boolean).join(' · ') })),
      })
    }
    const by = (r: number) => tz.ta.filter(p => p.km <= r).length
    const lvl = tz.percentile >= 70 ? T('высокий', 'high') : tz.percentile >= 40 ? T('средний', 'medium') : T('низкий', 'low')
    out.push({
      id: 'tourism', group: G.place, title: T('Уровень туризма', 'Tourism level'),
      sub: T('Сколько туристов вокруг и что посмотреть рядом', 'How touristy it is and what to see nearby'),
      sources,
      vizs: [
        { kind: 'bars', title: T('Места из топа TripAdvisor по расстоянию', 'TripAdvisor top places by distance'), max: Math.max(1, by(10)), color: ORANGE, rows: [2, 5, 10].map(r => ({ label: T(`до ${r} км`, `within ${r} km`), value: by(r), text: String(by(r)) })) },
      ],
      bigs: [{ v: `${tz.percentile}`, l: T(`из 100 — уровень туризма ${lvl}`, `of 100 — ${lvl} tourism`) }, { v: String(ta10.length), l: T('мест топа TripAdvisor в 10 км', 'TripAdvisor top places within 10 km') }],
      meaning: tz.percentile >= 70 ? T('место туристическое: гостей много, посуточная аренда востребована, но вокруг оживлённо.', 'a touristy spot: lots of guests and demand for short stays, but busy around.')
        : tz.percentile >= 40 ? T('туристов в меру: гости есть, а вокруг не шумно.', 'moderately touristy: guests come, yet it stays calm.')
        : T('тихое место, туристов мало: для жизни спокойно, для посуточной аренды слабее.', 'a quiet spot with few tourists: calm living, weaker for short stays.'),
      footnote: T('Тепловая карта — по отзывам иностранцев на места Google; рейтинг TripAdvisor «Things to Do in Bali».', 'Heat map from foreign reviews of Google places; TripAdvisor “Things to Do in Bali” ranking.'),
    })
  }

  // ── Как добраться ──────────────────────────────────────────────────
  const r = i.geo?.routes ?? {}
  const hubs = i.hubRoutes
  if (Object.keys(r).length || hubs.length) {
    const lbl: Record<string, [string, string]> = { sanur: ['Санур', 'Sanur'], airport: ['Аэропорт', 'Airport'], ubud_south: ['Южный Убуд', 'South Ubud'], canggu: ['Чангу', 'Canggu'], ubud: ['Убуд', 'Ubud'], uluwatu: ['Улувату', 'Uluwatu'] }
    for (const h of hubs) { const [ru1, en1] = h.name.split('|'); lbl[h.key] = [ru1, en1 ?? ru1] }
    // Минуты: где есть сверенные с Google — берём их, остальное — по дорогам OSRM.
    const geoMin = (k: string) => { const v = (r as Record<string, { s: number; static_s: number | null }>)[k]; return v ? Math.round((v.static_s ?? v.s) / 60) : null }
    // OSRM без пробок быстрее Google: поправку берём по точкам, где есть оба
    // замера до одной и той же точки (аэропорт, Чангу, Убуд, Санур), — медиана.
    const ratios = hubs.filter(h => h.key !== 'uluwatu').map(h => { const g = geoMin(h.key); return g && h.minutes ? g / h.minutes : null }).filter((x): x is number => x != null).sort((a, b) => a - b)
    const kOsrm = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 1
    // Район — круг вокруг центра: время и линия — до въезда в него («Убуд
    // начался»), а не до центра. Доля пути до въезда — по длине маршрута.
    const kmTo = (a: number[], lat: number, lng: number) => Math.hypot((a[1] - lat) * 111.2, (a[0] - lng) * 111.2 * Math.cos((lat * Math.PI) / 180))
    const entry = (h: ExtraRoute) => {
      const hub = BALI_HUBS.find(x => x.key === h.key)
      const c = h.coords
      if (!hub?.rKm || c.length < 2) return { coords: c, frac: 1 }
      const seg = c.slice(1).map((p, j) => kmTo(p, c[j][1], c[j][0]))
      const total = seg.reduce((x, y) => x + y, 0) || 1
      let run = 0
      for (let j = 1; j < c.length; j++) {
        run += seg[j - 1]
        if (kmTo(c[j], hub.lat, hub.lng) <= hub.rKm) return { coords: c.slice(0, j + 1), frac: run / total }
      }
      return { coords: c, frac: 1 }
    }
    const cut = new Map(hubs.map(h => [h.key, entry(h)]))
    const legs = (hubs.length
      ? hubs.map(h => ({ k: h.key, min: h.key === 'airport' && geoMin('airport') != null ? geoMin('airport')! : Math.max(1, Math.round(h.minutes * cut.get(h.key)!.frac * kOsrm)) }))
      : (Object.keys(r).filter(k => k !== 'ubud_south').map(k => ({ k, min: geoMin(k)! })))).sort((a, b) => a.min - b.min)
    const lineColor: Record<string, string> = { airport: ORANGE, canggu: GREEN, seminyak: '#0E9C8C', kuta: '#D4A017', ubud: BLUE, sanur: '#6A736E', jimbaran: '#C9443A', nusa_dua: '#D2559B', uluwatu: PURPLE }
    // Ближе 2,5 км — пешком (4,8 км/ч по длине маршрута), дальше — на машине.
    const walkMin = (m: number) => Math.max(1, Math.round(m / 80))
    const extra = i.extraRoutes.map(x => ({ coords: x.coords, color: x.kind === 'beach' ? '#2E7DD1' : '#C9443A',
      label: x.meters <= 2500 ? `${x.name} · ${T(`пешком ${walkMin(x.meters)} мин`, `${walkMin(x.meters)} min walk`)}` : `${x.name} · ${x.minutes} ${T('мин', 'min')}`, x }))
    const minOf = (k: string) => legs.find(l => l.k === k)?.min ?? '?'
    const lines = hubs.length
      ? hubs.map(h => ({ coords: cut.get(h.key)!.coords, color: lineColor[h.key] ?? GREEN, label: `${T(lbl[h.key][0], lbl[h.key][1])} · ${minOf(h.key)} ${T('мин', 'min')}` }))
      : Object.entries(i.geo?.route_lines ?? {}).filter(([k]) => k !== 'sanur' && k !== 'ubud_south').map(([k, coords]) => ({ coords: coords as number[][], color: lineColor[k] ?? GREEN, label: `${T(lbl[k]?.[0] ?? k, lbl[k]?.[1] ?? k)} · ${minOf(k)} ${T('мин', 'min')}` }))
    const air = legs.find(l => l.k === 'airport')
    const vizs: Viz[] = []
    let routeMap: Viz | undefined
    if (lines.length && center) {
      const allPts = lines.flatMap(l => l.coords)
      const lngs = allPts.map(p => p[0]), lats = allPts.map(p => p[1])
      const c = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 }
      // Самый крупный зум, при котором все маршруты влезают в карту 960×640 с полями.
      const wx = (lng: number, z: number) => ((lng + 180) / 360) * 256 * 2 ** z
      const wy = (lat: number, z: number) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 256 * 2 ** z }
      let zoom = 13
      while (zoom > 8 && (wx(Math.max(...lngs), zoom) - wx(Math.min(...lngs), zoom) > 860 || wy(Math.min(...lats), zoom) - wy(Math.max(...lats), zoom) > 560)) zoom--
      routeMap = { kind: 'map', title: T('Маршруты на карте', 'Routes on the map'), center: c, zoom, aspect: 1.5, base: 'street', credit: 'Esri, OpenStreetMap', alt: T(`Маршруты от ${VA('виллы', 'апартаментов')}`, `Routes from the ${VA('villa', 'apartment')}`), lines, pins: [{ ...center, color: '#0F1A15' }], tags: lines.map(l => ({ lat: l.coords[l.coords.length - 1][1], lng: l.coords[l.coords.length - 1][0], label: l.label })) }
    }
    if (extra.length) vizs.push({ kind: 'bars', title: T('До пляжа и мест TripAdvisor', 'To the beach and TripAdvisor places'), max: Math.max(...extra.map(e => e.x.meters <= 2500 ? walkMin(e.x.meters) : e.x.minutes)), color: '#C9443A',
      rows: extra.map(e => { const walk = e.x.meters <= 2500; const v = walk ? walkMin(e.x.meters) : e.x.minutes; return { label: e.x.name, value: v, text: walk ? T(`${v} мин пешком`, `${v} min walk`) : `${v} ${T('мин', 'min')}` } }) })
    vizs.push({ kind: 'bars', title: T('Минут на машине', 'Minutes by car'), max: Math.max(...legs.map(l => l.min)), color: GREEN, rows: legs.map(l => ({ label: T(lbl[l.k]?.[0] ?? l.k, lbl[l.k]?.[1] ?? l.k), value: l.min, text: `${l.min} ${T('мин', 'min')}` })) })
    out.push({
      id: 'routes', group: G.place, title: T('Как добраться', 'Getting around'),
      sub: T('Маршруты до аэропорта, Чангу, Убуда, Улувату, Нуса-Дуа и других районов', 'Routes to the airport, Canggu, Ubud, Uluwatu, Nusa Dua and other areas'),
      sources: [{
        name: T('Маршруты по дорогам', 'Road routes'), fresh: T('OpenStreetMap + сверка с Google', 'OpenStreetMap, checked against Google'), live: routeMap,
        chips: legs.slice(0, 4).map(l => T(lbl[l.k]?.[0] ?? l.k, lbl[l.k]?.[1] ?? l.k).toLowerCase()),
        total: legs.length, unit: T('маршрут|маршрута|маршрутов', 'routes'),
        names: legs.map(l => `${T(lbl[l.k]?.[0] ?? l.k, lbl[l.k]?.[1] ?? l.k)} — ${l.min} ${T('мин', 'min')}`),
        result: legs.map(l => `${T(lbl[l.k]?.[0] ?? l.k, lbl[l.k]?.[1] ?? l.k)} ${l.min} ${T('мин', 'min')}`).join(' · '),
      }, ...(extra.length && center ? [{
        name: T('Пляж и места TripAdvisor', 'Beach & TripAdvisor places'), fresh: T('OpenStreetMap, по дорогам', 'OpenStreetMap, by road'),
        chips: [T('ближайший пляж', 'nearest beach'), T('топ TripAdvisor', 'TripAdvisor top')],
        total: extra.length, unit: T('маршрут|маршрута|маршрутов', 'routes'),
        names: extra.map(e => e.label),
        result: extra.map(e => e.label).join(' · '),
        live: fitMap(T('Маршруты до пляжа и мест TripAdvisor', 'Routes to the beach and TripAdvisor places'), extra.map(e => ({ coords: e.coords, color: e.color, label: e.label })), center),
      } as Source] : []),
      ],
      vizs,
      bigs: [...(air ? [{ v: `${air.min} ${T('мин', 'min')}`, l: T('до аэропорта', 'to the airport') }] : []), { v: `${legs[0].min} ${T('мин', 'min')}`, l: T(`до: ${lbl[legs[0].k]?.[0] ?? legs[0].k}`, `to ${lbl[legs[0].k]?.[1] ?? legs[0].k}`) }],
      meaning: air && air.min <= 30 ? T('гостям из аэропорта ехать меньше получаса.', `guests reach the ${VA('villa', 'apartment')} from the airport in under half an hour.`) : air ? T(`от аэропорта около ${air.min} минут.`, `about ${air.min} minutes from the airport.`) : T('время в пути до главных районов.', 'drive times to main areas.'),
      footnote: T('На машине, без пробок, до въезда в район, а не до его центра.', 'By car, without traffic, to the edge of each area rather than its centre.'),
    })
  }

  // ── Погода и ветер ─────────────────────────────────────────────────
  if (cl && cl['01']) {
    const MON = ru ? ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'] : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
    const months = MON.map((l, k) => ({ l, m: cl[String(k + 1).padStart(2, '0')] })).filter(x => x.m)
    const yr = cl.year
    const sources: Source[] = [{
      name: 'NASA POWER', fresh: yr ? T(`среднее за ${yr.years} лет`, `${yr.years}-year average`) : T('по месяцам', 'monthly'),
      chips: [T('дожди', 'rain'), T('солнце', 'sun'), T('жара', 'heat')],
      total: 365, unit: T('день|дня|дней', 'days'),
      names: months.map((x, k) => `${(ru ? ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])[k]} — ${x.m.sunny} ${T('солнечных', 'sunny')}`),
      result: yr ? T(`За год в среднем ${yr.sunny} ${plw(yr.sunny, 'солнечный|солнечных|солнечных')} и ${yr.wet} ${plw(yr.wet, 'дождливый день|дождливых дня|дождливых дней')}`, `${yr.sunny} sunny and ${yr.wet} rainy days a year on average`) : T('Погода по месяцам', 'Weather by month'),
    }]
    const vizs: Viz[] = []
    const w = cl.wind
    if (w && center) {
      const dirs = ru ? ['север', 'северо-восток', 'восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад'] : ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
      const order = w.all.pct.map((p, k) => ({ p, k })).sort((a, b) => b.p - a.p)
      sources.push({
        name: 'ERA5-Land (Copernicus)', fresh: T('ветер по часам', 'hourly wind'),
        chips: [T('направление', 'direction'), T('сила', 'speed')],
        total: 8, unit: T('направление|направления|направлений', 'directions'),
        names: order.map(o => `${dirs[o.k]} — ${Math.round(o.p)}%`),
        result: T(`Чаще дует: ${dirs[order[0].k]} и ${dirs[order[1].k]}, в среднем ${dec(w.all.avg_ms)} м/с`, `Mostly from the ${dirs[order[0].k]} and ${dirs[order[1].k]}, ${dec(w.all.avg_ms)} m/s on average`),
      })
      vizs.push({ kind: 'map', title: T(`Ветер над участком: чаще с направления «${dirs[order[0].k]}»`, `Wind over the plot: mostly from the ${dirs[order[0].k]}`), center, zoom: 18, aspect: 1, base: 'sat', rose: w.all.pct, credit: 'Esri, ERA5-Land', alt: T(`Роза ветров: чаще всего ${dirs[order[0].k]}`, `Wind rose: mostly ${dirs[order[0].k]}`), pins: [{ ...center, color: '#0F1A15' }] })
    }
    const MLONG = ru ? ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    if (months.length === 12) vizs.unshift({ kind: 'months', title: yr ? T(`Погода по месяцам · ${yr.sunny} ${plw(yr.sunny, 'солнечный день|солнечных дня|солнечных дней')} в году`, `Weather by month · ${yr.sunny} sunny days a year`) : T('Погода по месяцам', 'Weather by month'), sunnyLbl: T('солнечных', 'sunny'), months: months.map((x, k) => ({ label: MLONG[k], sunny: x.m.sunny, tmax: x.m.t_max, wet: x.m.wet })) })
    out.push({
      id: 'weather', group: G.life, title: T('Погода и ветер', 'Weather & wind'),
      sub: T('Солнце и дожди по месяцам, откуда дует ветер', 'Sun and rain by month, wind direction'),
      sources, vizs,
      bigs: [...(yr ? [{ v: String(yr.sunny), l: T(`${plw(yr.sunny, 'солнечный день|солнечных дня|солнечных дней')} в году`, 'sunny days a year') }] : []), ...(w ? [{ v: `${dec(w.all.avg_ms)} ${T('м/с', 'm/s')}`, l: T('средний ветер', 'average wind') }] : [])],
      meaning: yr && yr.sunny > yr.wet * 1.5 ? T('солнечных дней заметно больше, чем дождливых.', 'sunny days clearly outnumber rainy ones.') : T('сезон дождей здесь ощутимый — учитывайте при сдаче.', 'the rainy season is noticeable — plan rentals around it.'),
      footnote: 'NASA POWER, ERA5-Land.',
    })
  }

  // ── Воздух ─────────────────────────────────────────────────────────
  const aq = i.geo?.air
  if (aq?.uaqi_avg != null) {
    const a = aq.uaqi_avg
    const word = a >= 60 ? T('хороший', 'good') : a >= 40 ? T('умеренный', 'moderate') : T('плохой', 'poor')
    out.push({
      id: 'air', group: G.life, title: T('Воздух', 'Air'),
      sub: T('Качество воздуха по часовым замерам', 'Air quality from hourly readings'),
      sources: [{
        name: 'Google Air Quality', fresh: T(`${num(aq.hours)} часов замеров`, `${num(aq.hours)} hours of readings`),
        chips: [T('индекс воздуха', 'air index'), T('по часам', 'hourly')],
        total: aq.hours, unit: T('час|часа|часов', 'hours'),
        names: [T(`средний индекс — ${a}`, `average index — ${a}`), ...(aq.ispu_avg != null ? [T(`индонезийская шкала — ${aq.ispu_avg}`, `Indonesian scale — ${aq.ispu_avg}`)] : [])],
        result: T(`Индекс ${a} из 100 — ${word}`, `Index ${a} of 100 — ${word}`),
      }],
      vizs: [{ kind: 'gauge', title: T(`Качество воздуха за ${num(aq.hours)} часов`, `Air quality over ${num(aq.hours)} hours`), avg: a, min: null, max: null, caption: T('Шкала Google: чем выше, тем чище.', 'Google scale: higher is cleaner.'), loLabel: T('0 — плохой', '0 — poor'), hiLabel: T('100 — чистый', '100 — clean'), avgLabel: T(`в среднем ${a}`, `average ${a}`) }],
      bigs: [{ v: String(a), l: T(`из 100 — ${word} воздух`, `of 100 — ${word} air`) }],
      meaning: a >= 60 ? T('дышать здесь легко — воздух чище, чем в большинстве городов.', 'easy to breathe here — cleaner than most cities.') : T('воздух средний — проверьте, нет ли рядом стройки или трассы.', 'average air — check for nearby construction or main roads.'),
    })
  }

  // ── Климат к 2050 ──────────────────────────────────────────────────
  const C = climate2050 as unknown as { t: Record<string, { median: number }>; cd: Record<string, { median: number }> }
  if (C?.t?.ssp2_4_5 && C?.cd?.ssp2_4_5) {
    const t1 = C.t.ssp2_4_5.median, t2 = C.t.ssp5_8_5.median, c1 = Math.round(C.cd.ssp2_4_5.median), c2 = Math.round(C.cd.ssp5_8_5.median)
    const f = (x: number) => x.toFixed(1).replace('.', ru ? ',' : '.')
    out.push({
      id: 'climate', group: G.life, title: T('Климат к 2050', 'Climate by 2050'),
      sub: T('Насколько станет теплее и сколько добавится кондиционера', 'How much warmer and how much more air conditioning'),
      sources: [{
        name: 'Copernicus C3S', fresh: T('прогноз на 2041–2060', '2041–2060 projection'),
        chips: [T('температура', 'temperature'), T('дожди', 'rain'), T('кондиционер', 'air conditioning')],
        total: 23, unit: T('модель|модели|моделей', 'models'),
        names: [T(`умеренный сценарий — +${f(t1)} °C`, `moderate — +${f(t1)} °C`), T(`жёсткий сценарий — +${f(t2)} °C`, `severe — +${f(t2)} °C`), T(`кондиционер — +${c1}%`, `AC — +${c1}%`), T(`кондиционер — +${c2}%`, `AC — +${c2}%`)],
        result: T(`К 2041–2060 теплее на ${f(t1)}–${f(t2)} °C, кондиционер работает на ${c1}–${c2}% больше`, `By 2041–2060: ${f(t1)}–${f(t2)} °C warmer, ${c1}–${c2}% more air conditioning`),
      }],
      vizs: [
        { kind: 'bars', title: T('Теплее к 2041–2060 (против 1995–2014)', 'Warmer by 2041–2060 (vs 1995–2014)'), max: 2, color: ORANGE, rows: [{ label: T('Умеренно', 'Moderate'), value: t1, text: `+${f(t1)} °C` }, { label: T('Жёстко', 'Severe'), value: t2, text: `+${f(t2)} °C` }] },
        { kind: 'bars', title: T('Работа кондиционера', 'Air-conditioning use'), max: 30, color: ORANGE, rows: [{ label: T('Умеренно', 'Moderate'), value: c1, text: `+${c1}%` }, { label: T('Жёстко', 'Severe'), value: c2, text: `+${c2}%` }] },
      ],
      bigs: [{ v: `+${f(t1)}…${f(t2)} °C`, l: T('к 2050', 'by 2050') }, { v: `+${c1}…${c2}%`, l: T('работы кондиционера', 'air conditioning') }],
      meaning: T('расход на кондиционер к 2050 вырастет примерно на пятую часть — тень и вентиляция в доме будут цениться выше.', 'air-conditioning costs will rise by about a fifth by 2050 — shade and ventilation will matter more.'),
      footnote: T('Copernicus C3S Atlas, CMIP6, по всему Бали.', 'Copernicus C3S Atlas, CMIP6, Bali-wide.'),
    })
  }

  return out
}
