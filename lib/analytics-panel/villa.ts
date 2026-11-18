import type { Analysis, Source, Viz } from './types'
import type { InvestmentSnapshot } from '@/lib/investment/snapshot'
import type { AirbnbComp } from '@/lib/airbnb-nearby'
import type { SaleCompsBundle } from '@/lib/sale-comps'
import type { GeoFacts } from '@/lib/complex-access'
import type { NearbyPlace, NearbyCategory } from '@/lib/nearby-places'
import { zoneRows, plotLabel, type RdtrData } from '@/lib/rdtr-zones'
import type { LandPriceBundle } from '@/lib/land-prices'
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
  const loc = ru ? 'ru-RU' : 'en-US'
  const num = (n: number) => Math.round(n).toLocaleString(loc)
  // Деньги — меткой ⟦usd⟧: панель на клиенте подставит валюту посетителя.
  const usd = (n: number) => `⟦${Math.round(n * 100) / 100}⟧`
  const dist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} ${T('м', 'm')}` : `${km.toFixed(1).replace('.', ru ? ',' : '.')} ${T('км', 'km')}`)
  const G = { money: T('Деньги', 'Money'), docs: T('Документы и участок', 'Documents & land'), place: T('Место', 'Location'), life: T('Жизнь в доме', 'Living') }
  const out: Analysis[] = []
  const dec = (x: number) => String(x).replace('.', ru ? ',' : '.')
  // «2026-11-13» → «13.11.2026».
  // «maksimal : 50%» → «до 50%» (поля KDB/KDH госплана).
  const lim = (x: string) => x.replace(/maksimal\s*:\s*/i, T('до ', 'up to ')).replace(/minimal\s*:\s*/i, T('от ', 'at least '))
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
      sub: T('Сколько просят за месяц и год за похожие виллы', 'Monthly and yearly asking rents for similar villas'),
      sources,
      vizs: vals.length >= 3 ? [{ kind: 'strip', title: T('Аренда на месяц: похожие виллы', 'Monthly rent: similar villas'), points: vals, lo, hi, mark: { value: m.p50, label: T(`середина ${usd(m.p50)}`, `median ${usd(m.p50)}`) }, loLabel: usd(lo), hiLabel: usd(hi) }] : [],
      bigs: [{ v: usd(m.p50), l: T('в месяц — середина рынка', 'a month, market median') }, { v: num(m.n), l: T('объявлений в сравнении', 'listings compared') }],
      meaning: T(`если сдавать на год, ориентир — около ${usd(m.p50)} в месяц за похожую виллу.`, `for a yearly lease, expect about ${usd(m.p50)} a month for a similar villa.`),
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
      sources.push({
        name: T('Госплан зон (GISTARU)', 'Zoning plan (GISTARU)'), fresh: i.rdtr.data.fetchedAt ? T(`данные на ${d8(i.rdtr.data.fetchedAt)}`, `as of ${d8(i.rdtr.data.fetchedAt)}`) : 'ATR/BPN',
        chips: [T('зона участка', 'plot zone'), T('что можно строить', 'what can be built')],
        total: 1, unit: T('участок|участка|участков', 'plot'),
        names: [plot?.label ?? p.name ?? '', p.kdb ? T(`застройка ${lim(p.kdb)}`, `coverage ${lim(p.kdb)}`) : '', p.kdh ? T(`зелень ${lim(p.kdh)}`, `green ${lim(p.kdh)}`) : ''].filter(Boolean),
        result: [plot?.label, p.kdb ? T(`застройка ${lim(p.kdb)}`, `coverage ${lim(p.kdb)}`) : null, p.kdh ? T(`зелень ${lim(p.kdh)}`, `green ${lim(p.kdh)}`) : null].filter(Boolean).join(' · '),
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
      vizs.push({ kind: 'image', title: T(`Зоны госплана на снимке, ${i.rdtr.data.radius} м вокруг`, `Zoning on the satellite image, ${i.rdtr.data.radius} m around`), src: i.rdtr.image, aspect: 1, alt: T('Снимок участка с цветами зон', 'Satellite image with zone colours'), credit: 'GISTARU ATR/BPN', legend: rows.slice(0, 6).map(r => ({ color: r.color, label: `${r.label} ${Math.round(r.share * 100)}%` })) })
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
        sub: T('Зона по госплану, уклон, дорога, море, природные риски', 'Zoning, slope, road, sea, natural hazards'),
        sources, vizs,
        bigs: [...(plot ? [{ v: plot.label.split('·').pop()!.trim(), l: plot.label.split('·')[0].trim() }] : []), ...(sea ? [{ v: `${dec(sea.margin_m)} ${T('м', 'm')}`, l: T('запас над водой к 2050', 'margin above water by 2050') }] : pl ? [{ v: `${num(pl.coast_m)} ${T('м', 'm')}`, l: T('до моря', 'to the sea') }] : [])],
        meaning: [flat ? T('участок ровный', 'the plot is flat') : null, pl ? T(`дорога в ${Math.round(pl.road.m)} м`, `road ${Math.round(pl.road.m)} m away`) : null, noHz ? T('госкарта не отмечает тут ни наводнений, ни цунами', 'the government map flags no flood or tsunami here') : null].filter(Boolean).join(', ') + '.',
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
      const inMap = near.filter(p => p.distanceKm <= 0.9)
      const best = (k: string) => i.nearby!.byCategory[k]?.slice().sort((a, b) => a.distanceKm - b.distanceKm)[0]
      const tags = (['beach', 'cafe', 'supermarket', 'school'] as const).map(k => ({ k, p: best(k) })).filter(x => x.p && x.p.distanceKm <= 0.9)
      const catTitle = (c: NearbyCategory) => (ru ? c.title : ({ beach: 'Beaches', restaurant: 'Restaurants', cafe: 'Cafés', nightlife: 'Bars & clubs', attraction: 'Sights', school: 'Schools', preschool: 'Kindergartens', supermarket: 'Shops', pharmacy: 'Pharmacies', hospital: 'Clinics', shopping_mall: 'Malls', ferry_terminal: 'Ports', wellness: 'Yoga & fitness', beachclub: 'Beach clubs', international_school: 'Intl schools', coworking: 'Coworkings' } as Record<string, string>)[c.key] ?? c.title)
      const BUCKET: Record<string, [string, string]> = { restaurant: ['Рестораны', 'Restaurants'], cafe: ['Кафе', 'Cafés'], bar: ['Бары', 'Bars'], hotel: ['Отели', 'Hotels'], shopping: ['Магазины', 'Shops'], spa: ['Спа', 'Spas'], fitness: ['Фитнес', 'Fitness'], beach: ['Пляжи', 'Beaches'], beach_club: ['Beach clubs', 'Beach clubs'], attraction: ['Достопримечательности', 'Sights'], kids_fun: ['Для детей', 'Kids'], health: ['Клиники', 'Clinics'], school: ['Школы', 'Schools'], temple: ['Храмы', 'Temples'], coworking: ['Коворкинги', 'Coworkings'] }
      const r1 = i.around1km
      const counts = r1 ? Object.entries(r1).filter(([, n]) => n > 0).map(([k, n]) => ({ label: T(BUCKET[k]?.[0] ?? k, BUCKET[k]?.[1] ?? k), n })).sort((a, b) => b.n - a.n) : []
      const totalNear = r1 ? counts.reduce((x, y) => x + y.n, 0) : 0
      out.push({
        id: 'nearby', group: G.place, title: T('Что рядом', 'What’s nearby'),
        sub: T('Пляжи, кафе, магазины, школы, клиники', 'Beaches, cafés, shops, schools, clinics'),
        sources: [{
          name: 'Google Maps', fresh: T('места с отзывами', 'places with reviews'),
          chips: cats.slice(0, 5).map(c => catTitle(c).toLowerCase()),
          total: totalNear || near.filter(p => p.distanceKm <= 1).length, unit: T('место|места|мест', 'places'),
          names: near.slice(0, 14).map(p => `${p.name} — ${dist(p.distanceKm)}${p.rating ? ` ★${p.rating}` : ''}`),
          result: totalNear ? T(`${totalNear} ${plw(totalNear, 'место|места|мест')} с хорошими отзывами в 1 км: `, `${totalNear} well-reviewed places within 1 km: `) + counts.slice(0, 4).map(x => `${x.label.toLowerCase()} ${x.n}`).join(', ') : T('Ближайшие места — на карте', 'Nearest places are on the map'),
        }],
        vizs: [
          { kind: 'map', title: T('Карта: что в шаговой доступности', 'Map: what’s within walking distance'), center, zoom: 16, aspect: 1.5, base: 'street', credit: 'Esri, Google Maps', alt: T('Карта мест рядом с виллой', 'Map of places near the villa'),
            pins: [...inMap.map(p => ({ lat: p.lat, lng: p.lng, color: colorOf(p.cat) })), { ...center, color: '#0F1A15' }],
            tags: tags.map(({ p }) => ({ lat: p!.lat, lng: p!.lng, label: `${p!.name?.slice(0, 22)} · ${dist(p!.distanceKm)}` })),
            legend: [{ color: GREEN, label: T('Еда и бары', 'Food & bars') }, { color: BLUE, label: T('Пляж', 'Beach') }, { color: PURPLE, label: T('Школы', 'Schools') }, { color: '#C9443A', label: T('Здоровье', 'Health') }, { color: ORANGE, label: T('Другое', 'Other') }, { color: '#0F1A15', label: T('Эта вилла', 'This villa') }] },
          ...(counts.length ? [{ kind: 'bars' as const, title: T('Места с хорошими отзывами в 1 км', 'Well-reviewed places within 1 km'), max: counts[0].n, rows: counts.slice(0, 8).map(x => ({ label: x.label, value: x.n, text: String(x.n) })) }] : []),
        ],
        bigs: [...(totalNear ? [{ v: num(totalNear), l: T('мест в 1 км', 'places within 1 km') }] : []), ...(best('beach') ? [{ v: dist(best('beach')!.distanceKm), l: T('до пляжа', 'to the beach') }] : [])],
        meaning: best('beach') && best('beach')!.distanceKm <= 1.5 ? T('пляж и кафе — пешком, гостям не нужен байк.', 'the beach and cafés are walkable — guests don’t need a scooter.') : T('всё нужное рядом, но до пляжа — на транспорте.', 'daily needs are close, the beach needs transport.'),
        footnote: 'Google Maps.',
      })
    }
  }

  // ── Как добраться ──────────────────────────────────────────────────
  const r = i.geo?.routes
  if (r && Object.keys(r).length) {
    const lbl: Record<string, [string, string]> = { sanur: ['Санур', 'Sanur'], airport: ['Аэропорт', 'Airport'], ubud_south: ['Южный Убуд', 'South Ubud'], canggu: ['Чангу', 'Canggu'], ubud: ['Убуд', 'Ubud'], uluwatu: ['Улувату', 'Uluwatu'] }
    const legs = (Object.entries(r) as [string, { s: number; static_s: number | null }][]).map(([k, v]) => ({ k, min: Math.round((v.static_s ?? v.s) / 60), peak: Math.round(v.s / 60) })).sort((a, b) => a.min - b.min)
    const lineColor: Record<string, string> = { airport: ORANGE, canggu: GREEN, ubud: BLUE, uluwatu: PURPLE, sanur: '#6A736E', ubud_south: '#5AA9E6' }
    const lines = Object.entries(i.geo?.route_lines ?? {}).filter(([k]) => k !== 'sanur' && k !== 'ubud_south').map(([k, coords]) => ({ coords: coords as number[][], color: lineColor[k] ?? GREEN, label: `${T(lbl[k]?.[0] ?? k, lbl[k]?.[1] ?? k)} · ${legs.find(l => l.k === k)?.min ?? '?'} ${T('мин', 'min')}` }))
    const air = legs.find(l => l.k === 'airport')
    const vizs: Viz[] = []
    if (lines.length && center) {
      const allPts = lines.flatMap(l => l.coords)
      const lngs = allPts.map(p => p[0]), lats = allPts.map(p => p[1])
      const c = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 }
      // Самый крупный зум, при котором все маршруты влезают в карту 960×640 с полями.
      const wx = (lng: number, z: number) => ((lng + 180) / 360) * 256 * 2 ** z
      const wy = (lat: number, z: number) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 256 * 2 ** z }
      let zoom = 13
      while (zoom > 8 && (wx(Math.max(...lngs), zoom) - wx(Math.min(...lngs), zoom) > 860 || wy(Math.min(...lats), zoom) - wy(Math.max(...lats), zoom) > 560)) zoom--
      vizs.push({ kind: 'map', title: T('Маршруты на карте', 'Routes on the map'), center: c, zoom, aspect: 1.5, base: 'street', credit: 'Esri, OpenStreetMap', alt: T('Маршруты от виллы', 'Routes from the villa'), lines, pins: [{ ...center, color: '#0F1A15' }], tags: lines.map(l => ({ lat: l.coords[l.coords.length - 1][1], lng: l.coords[l.coords.length - 1][0], label: l.label })) })
    }
    vizs.push({ kind: 'bars', title: T('Минут на машине', 'Minutes by car'), max: Math.max(...legs.map(l => l.min)), color: GREEN, rows: legs.map(l => ({ label: T(lbl[l.k]?.[0] ?? l.k, lbl[l.k]?.[1] ?? l.k), value: l.min, text: `${l.min} ${T('мин', 'min')}` })) })
    out.push({
      id: 'routes', group: G.place, title: T('Как добраться', 'Getting around'),
      sub: T('Сколько ехать до аэропорта и главных районов', 'Drive times to the airport and main areas'),
      sources: [{
        name: T('Маршруты', 'Routes'), fresh: T('OpenStreetMap + сверка с Google', 'OpenStreetMap, checked against Google'),
        chips: legs.slice(0, 4).map(l => T(lbl[l.k]?.[0] ?? l.k, lbl[l.k]?.[1] ?? l.k).toLowerCase()),
        total: legs.length, unit: T('маршрут|маршрута|маршрутов', 'routes'),
        names: legs.map(l => `${T(lbl[l.k]?.[0] ?? l.k, lbl[l.k]?.[1] ?? l.k)} — ${l.min} ${T('мин', 'min')}`),
        result: legs.map(l => `${T(lbl[l.k]?.[0] ?? l.k, lbl[l.k]?.[1] ?? l.k)} ${l.min} ${T('мин', 'min')}`).join(' · '),
      }],
      vizs,
      bigs: [...(air ? [{ v: `${air.min} ${T('мин', 'min')}`, l: T('до аэропорта', 'to the airport') }] : []), { v: `${legs[0].min} ${T('мин', 'min')}`, l: T(`до: ${lbl[legs[0].k]?.[0] ?? legs[0].k}`, `to ${lbl[legs[0].k]?.[1] ?? legs[0].k}`) }],
      meaning: air && air.min <= 30 ? T('гостям из аэропорта ехать меньше получаса.', 'guests reach the villa from the airport in under half an hour.') : air ? T(`от аэропорта около ${air.min} минут.`, `about ${air.min} minutes from the airport.`) : T('время в пути до главных районов.', 'drive times to main areas.'),
      footnote: T('На машине, без пробок.', 'By car, without traffic.'),
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
      vizs.push({ kind: 'map', title: T('Ветер над участком: откуда дует', 'Wind over the plot: where it blows from'), center, zoom: 18, aspect: 1, base: 'sat', rose: w.all.pct, credit: 'Esri, ERA5-Land', alt: T(`Роза ветров: чаще всего ${dirs[order[0].k]}`, `Wind rose: mostly ${dirs[order[0].k]}`), pins: [{ ...center, color: '#0F1A15' }] })
    }
    if (months.length === 12) vizs.push({ kind: 'cols', title: T('Солнечных дней по месяцам', 'Sunny days by month'), max: 31, cols: months.map(x => ({ label: x.l, value: x.m.sunny, text: String(x.m.sunny), hot: x.m.sunny >= 20 })) })
    out.push({
      id: 'weather', group: G.life, title: T('Погода и ветер', 'Weather & wind'),
      sub: T('Солнце и дожди по месяцам, откуда дует ветер', 'Sun and rain by month, wind direction'),
      sources, vizs,
      bigs: [...(yr ? [{ v: String(yr.sunny), l: T('солнечных дней в году', 'sunny days a year') }] : []), ...(w ? [{ v: `${dec(w.all.avg_ms)} ${T('м/с', 'm/s')}`, l: T('средний ветер', 'average wind') }] : [])],
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
