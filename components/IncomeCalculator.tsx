'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { computeEconomics } from '@/lib/investment/economics'
import { computeMonthlyEconomics, AGENT_FEE_PCT } from '@/lib/investment/monthly'
import type { RegionDefaults } from '@/lib/investment/regions'
import { pickCopy, type Lang } from '@/lib/i18n'
import { useCurrency } from './CurrencyContext'
import { formatPrice, formatPriceExact } from '@/lib/currency'
import { pluralRu } from '@/lib/plural-ru'
import { CompareButton, type CompareData } from './NeighborComparePopup'

const COPY = {
  ru: {
    title: 'Калькулятор дохода',
    sub: 'Цифры — по ставкам соседей, а не обещание застройщика.',
    tabDaily: 'Посуточно',
    tabMonthly: 'Помесячно',
    priceNight: 'Цена за ночь',
    occupancy: 'Загрузка',
    priceMonth: 'Цена в месяц',
    cheap: 'Как дешёвые',
    typical: 'Как большинство',
    expensive: 'Как дорогие',
    yieldLabel: 'Доходность',
    yieldUnit: 'годовых',
    netMonth: 'На руки',
    netMonthUnit: 'в месяц',
    netYear: 'В год',
    netYearUnit: 'чистыми',
    paybackLabel: 'Окупаемость',
    noPayback: 'не окупится',
    approxYears: (n: number) => `≈ ${n} ${pluralRu(n, ['год', 'года', 'лет'])}`,
    dailyLink: (n: number) => `Соседи, которые уже сдают посуточно: ${n} ${pluralRu(n, ['объект', 'объекта', 'объектов'])}`,
    monthlyLink: (n: number) => `Соседи, которые сдают помесячно: ${n} ${pluralRu(n, ['объект', 'объекта', 'объектов'])}`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `Средняя ставка для ${apt ? 'апартаментов' : 'вилл'}${bedrooms ? ` с ${bedrooms} ${pluralRu(bedrooms, ['спальней', 'спальнями', 'спальнями'])}` : ''}${district ? `, район ${district}` : ''} — ${price}/мес.`,
    pctSuffix: '%',
  },
  en: {
    title: 'Income calculator',
    sub: "Based on neighbours' rates, not the developer's promise.",
    tabDaily: 'Nightly',
    tabMonthly: 'Monthly',
    priceNight: 'Price per night',
    occupancy: 'Occupancy',
    priceMonth: 'Price per month',
    cheap: 'Like cheap ones',
    typical: 'Like most',
    expensive: 'Like pricey ones',
    yieldLabel: 'Yield',
    yieldUnit: 'per year',
    netMonth: 'Net income',
    netMonthUnit: 'per month',
    netYear: 'Per year',
    netYearUnit: 'net',
    paybackLabel: 'Payback',
    noPayback: "won't pay back",
    approxYears: (n: number) => `≈ ${n} yrs`,
    dailyLink: (n: number) => `Neighbours renting nightly: ${n}`,
    monthlyLink: (n: number) => `Neighbours renting monthly: ${n}`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `Average rate for${bedrooms ? ` ${bedrooms}-bedroom` : ''} ${apt ? 'apartments' : 'villas'}${district ? ` in ${district}` : ''} — ${price}/mo.`,
    pctSuffix: '%',
  },
  id: {
    title: 'Kalkulator pendapatan', sub: 'Angka berdasarkan tarif tetangga, bukan janji pengembang.',
    tabDaily: 'Harian', tabMonthly: 'Bulanan', priceNight: 'Harga per malam', occupancy: 'Okupansi', priceMonth: 'Harga per bulan',
    cheap: 'Seperti yang murah', typical: 'Seperti kebanyakan', expensive: 'Seperti yang mahal',
    yieldLabel: 'Imbal hasil', yieldUnit: 'per tahun', netMonth: 'Bersih', netMonthUnit: 'per bulan', netYear: 'Per tahun', netYearUnit: 'bersih',
    paybackLabel: 'Balik modal', noPayback: 'tidak balik modal',
    approxYears: (n: number) => `≈ ${n} tahun`,
    dailyLink: (n: number) => `Tetangga yang menyewakan harian: ${n}`,
    monthlyLink: (n: number) => `Tetangga yang menyewakan bulanan: ${n}`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `Tarif rata-rata ${apt ? 'apartemen' : 'vila'}${bedrooms ? ` ${bedrooms} kamar tidur` : ''}${district ? ` di ${district}` : ''} — ${price}/bln.`,
    pctSuffix: '%',
  },
  fr: {
    title: 'Calculateur de revenus', sub: 'Chiffres basés sur les tarifs des voisins, pas sur les promesses du promoteur.',
    tabDaily: 'À la nuitée', tabMonthly: 'Au mois', priceNight: 'Prix par nuit', occupancy: 'Taux d’occupation', priceMonth: 'Prix par mois',
    cheap: 'Comme les moins chers', typical: 'Comme la plupart', expensive: 'Comme les plus chers',
    yieldLabel: 'Rendement', yieldUnit: 'par an', netMonth: 'Net', netMonthUnit: 'par mois', netYear: 'Par an', netYearUnit: 'net',
    paybackLabel: 'Retour sur investissement', noPayback: 'non rentabilisé',
    approxYears: (n: number) => `≈ ${n} ${n > 1 ? 'ans' : 'an'}`,
    dailyLink: (n: number) => `Voisins qui louent à la nuitée : ${n}`,
    monthlyLink: (n: number) => `Voisins qui louent au mois : ${n}`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `Loyer moyen des ${apt ? 'appartements' : 'villas'}${bedrooms ? ` de ${bedrooms} ${bedrooms > 1 ? 'chambres' : 'chambre'}` : ''}${district ? ` à ${district}` : ''} — ${price}/mois.`,
    pctSuffix: ' %',
  },
  de: {
    title: 'Einkommensrechner', sub: 'Zahlen nach den Preisen der Nachbarn, nicht nach dem Versprechen des Bauträgers.',
    tabDaily: 'Pro Nacht', tabMonthly: 'Pro Monat', priceNight: 'Preis pro Nacht', occupancy: 'Auslastung', priceMonth: 'Preis pro Monat',
    cheap: 'Wie die günstigen', typical: 'Wie die meisten', expensive: 'Wie die teuren',
    yieldLabel: 'Rendite', yieldUnit: 'pro Jahr', netMonth: 'Netto', netMonthUnit: 'pro Monat', netYear: 'Pro Jahr', netYearUnit: 'netto',
    paybackLabel: 'Amortisation', noPayback: 'amortisiert sich nicht',
    approxYears: (n: number) => `≈ ${n} ${n === 1 ? 'Jahr' : 'Jahre'}`,
    dailyLink: (n: number) => `Nachbarn mit Kurzzeitvermietung: ${n}`,
    monthlyLink: (n: number) => `Nachbarn mit Monatsvermietung: ${n}`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `Durchschnittsmiete für ${apt ? 'Apartments' : 'Villen'}${bedrooms ? ` mit ${bedrooms} ${bedrooms === 1 ? 'Schlafzimmer' : 'Schlafzimmern'}` : ''}${district ? ` in ${district}` : ''} — ${price}/Monat.`,
    pctSuffix: ' %',
  },
  zh: {
    title: '收益计算器', sub: '数字基于周边房源的价格，而非开发商的承诺。',
    tabDaily: '按晚出租', tabMonthly: '按月出租', priceNight: '每晚价格', occupancy: '入住率', priceMonth: '每月价格',
    cheap: '按便宜的', typical: '按大多数', expensive: '按昂贵的',
    yieldLabel: '收益率', yieldUnit: '每年', netMonth: '净收入', netMonthUnit: '每月', netYear: '每年', netYearUnit: '净收入',
    paybackLabel: '回本', noPayback: '无法回本',
    approxYears: (n: number) => `≈ ${n} 年`,
    dailyLink: (n: number) => `按晚出租的周边房源：${n} 个`,
    monthlyLink: (n: number) => `按月出租的周边房源：${n} 个`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `${district ? `${district} ` : ''}${bedrooms ? `${bedrooms}间卧室` : ''}${apt ? '公寓' : '别墅'}的平均月租 — ${price}/月。`,
    pctSuffix: '%',
  },
  nl: {
    title: 'Inkomstencalculator', sub: 'Cijfers op basis van de tarieven van de buren, niet de belofte van de ontwikkelaar.',
    tabDaily: 'Per nacht', tabMonthly: 'Per maand', priceNight: 'Prijs per nacht', occupancy: 'Bezetting', priceMonth: 'Prijs per maand',
    cheap: 'Zoals de goedkope', typical: 'Zoals de meeste', expensive: 'Zoals de dure',
    yieldLabel: 'Rendement', yieldUnit: 'per jaar', netMonth: 'Netto', netMonthUnit: 'per maand', netYear: 'Per jaar', netYearUnit: 'netto',
    paybackLabel: 'Terugverdientijd', noPayback: 'verdient zich niet terug',
    approxYears: (n: number) => `≈ ${n} jaar`,
    dailyLink: (n: number) => `Buren die per nacht verhuren: ${n}`,
    monthlyLink: (n: number) => `Buren die per maand verhuren: ${n}`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `Gemiddelde huur voor ${apt ? 'appartementen' : 'villa’s'}${bedrooms ? ` met ${bedrooms} ${bedrooms === 1 ? 'slaapkamer' : 'slaapkamers'}` : ''}${district ? ` in ${district}` : ''} — ${price}/mnd.`,
    pctSuffix: '%',
  },
  ban: {
    title: 'Kalkulator pikolih', sub: 'Angka manut aji tetangga, boya janji pengembang.',
    tabDaily: 'Rahinan', tabMonthly: 'Bulanan', priceNight: 'Aji awengi', occupancy: 'Okupansi', priceMonth: 'Aji asasih',
    cheap: 'Sakadi sane mudah', typical: 'Sakadi sane akéh', expensive: 'Sakadi sane mahal',
    yieldLabel: 'Pikolih', yieldUnit: 'atiban', netMonth: 'Bersih', netMonthUnit: 'asasih', netYear: 'Atiban', netYearUnit: 'bersih',
    paybackLabel: 'Balik modal', noPayback: 'nenten balik modal',
    approxYears: (n: number) => `≈ ${n} warsa`,
    dailyLink: (n: number) => `Tetangga sane nyewaang rahinan: ${n}`,
    monthlyLink: (n: number) => `Tetangga sane nyewaang bulanan: ${n}`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `Aji rata-rata ${apt ? 'apartemen' : 'vila'}${bedrooms ? ` ${bedrooms} kamar pules` : ''}${district ? ` ring ${district}` : ''} — ${price}/sasih.`,
    pctSuffix: '%',
  },
  pl: {
    title: 'Kalkulator dochodu', sub: 'Liczby na podstawie stawek sąsiadów, a nie obietnic dewelopera.',
    tabDaily: 'Na doby', tabMonthly: 'Na miesiące', priceNight: 'Cena za noc', occupancy: 'Obłożenie', priceMonth: 'Cena za miesiąc',
    cheap: 'Jak tanie', typical: 'Jak większość', expensive: 'Jak drogie',
    yieldLabel: 'Rentowność', yieldUnit: 'rocznie', netMonth: 'Na rękę', netMonthUnit: 'miesięcznie', netYear: 'Rocznie', netYearUnit: 'netto',
    paybackLabel: 'Zwrot', noPayback: 'nie zwróci się',
    approxYears: (n: number) => `≈ ${n} ${n === 1 ? 'rok' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'lata' : 'lat'}`,
    dailyLink: (n: number) => `Sąsiedzi wynajmujący na doby: ${n}`,
    monthlyLink: (n: number) => `Sąsiedzi wynajmujący na miesiące: ${n}`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `Średnia stawka za ${apt ? 'apartamenty' : 'wille'}${bedrooms ? ` z ${bedrooms} ${bedrooms === 1 ? 'sypialnią' : 'sypialniami'}` : ''}${district ? `, ${district}` : ''} — ${price}/mies.`,
    pctSuffix: '%',
  },
  uk: {
    title: 'Калькулятор доходу', sub: 'Цифри — за ставками сусідів, а не обіцянка забудовника.',
    tabDaily: 'Подобово', tabMonthly: 'Помісячно', priceNight: 'Ціна за ніч', occupancy: 'Завантаження', priceMonth: 'Ціна за місяць',
    cheap: 'Як дешеві', typical: 'Як більшість', expensive: 'Як дорогі',
    yieldLabel: 'Дохідність', yieldUnit: 'річних', netMonth: 'На руки', netMonthUnit: 'на місяць', netYear: 'На рік', netYearUnit: 'чистими',
    paybackLabel: 'Окупність', noPayback: 'не окупиться',
    approxYears: (n: number) => `≈ ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'рік' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'роки' : 'років'}`,
    dailyLink: (n: number) => `Сусіди, що здають подобово: ${n}`,
    monthlyLink: (n: number) => `Сусіди, що здають помісячно: ${n}`,
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string, apt = false) =>
      `Середня ставка для ${apt ? 'апартаментів' : 'вілл'}${bedrooms ? ` з ${bedrooms} ${bedrooms === 1 ? 'спальнею' : 'спальнями'}` : ''}${district ? `, район ${district}` : ''} — ${price}/міс.`,
    pctSuffix: '%',
  },
} as const

type CalcProps = {
  villa: {
    askingPrice: number
    area: number | null
    bedrooms: number | null
    leaseholdYearsLeft: number | null
    furnished?: boolean
    landRentYear?: number | null
    district: string | null
  }
  region: RegionDefaults
  dailyPresets: { p25: number; p50: number; p75: number } | null
  monthlyPresets: { p25: number; p50: number; p75: number } | null
  defaultOccupancyPct: number
  dailyCompCount: number
  monthlyCompCount: number
  restricted: boolean
  lang: Lang
  compareData?: CompareData | null
  /** Апартаменты: «ставка для апартаментов» вместо «для вилл». По умолчанию вилла. */
  kind?: 'villa' | 'apartment'
}

const OCC_PRESETS = [60, 75, 90] as const
const MONTHLY_OCC_PRESETS = [80, 90, 100] as const

function nearestOcc(pct: number): number {
  let best: number = OCC_PRESETS[0]
  let bestDist = Math.abs(pct - best)
  for (const o of OCC_PRESETS) {
    const d = Math.abs(pct - o)
    if (d < bestDist) { best = o; bestDist = d }
  }
  return best
}

export function IncomeCalculator({
  villa, region, dailyPresets, monthlyPresets, defaultOccupancyPct,
  dailyCompCount, monthlyCompCount, restricted, lang,
  compareData, kind = 'villa',
}: CalcProps) {
  const { currency } = useCurrency()
  const c = pickCopy(COPY, lang)
  const dec = (x: number) => (lang === 'en' || lang === 'zh' ? x.toFixed(1) : x.toFixed(1).replace('.', ','))

  const hasDaily = !!dailyPresets && !restricted
  const hasMonthly = !!monthlyPresets
  const defaultTab = hasDaily ? 'daily' : hasMonthly ? 'monthly' : null
  const [tab, setTab] = useState<'daily' | 'monthly'>(defaultTab ?? 'daily')

  const [dailyPrice, setDailyPrice] = useState(dailyPresets?.p50 ?? 0)
  const [dailyPreset, setDailyPreset] = useState<'p25' | 'p50' | 'p75' | null>('p50')
  const [occ, setOcc] = useState(nearestOcc(defaultOccupancyPct))
  const [monthlyPrice, setMonthlyPrice] = useState(monthlyPresets?.p50 ?? 0)
  const [monthlyPreset, setMonthlyPreset] = useState<'p25' | 'p50' | 'p75' | null>('p50')
  const [monthlyOcc, setMonthlyOcc] = useState(90)

  const dailyResult = useMemo(() => {
    if (!dailyPresets || dailyPrice <= 0) return null
    const e = computeEconomics({
      adr: dailyPrice,
      occupancy: occ / 100,
      adrRealization: region.adrRealizationByScenario.median,
      phrOwnerShare: region.phrOwnerShareByScenario.median,
      area: villa.area,
      bedrooms: villa.bedrooms,
      askingPrice: villa.askingPrice,
      leaseholdYearsLeft: villa.leaseholdYearsLeft,
      taxStatus: 'beforeTax',
      furnished: villa.furnished,
      landRentYear: villa.landRentYear,
      region,
    })
    return e
  }, [dailyPrice, occ, dailyPresets, villa, region])

  const monthlyResult = useMemo(() => {
    if (!monthlyPresets || monthlyPrice <= 0) return null
    const e = computeMonthlyEconomics({
      rentMonth: monthlyPrice,
      monthsRented: monthlyOcc / 100 * 12,
      agentFeePct: AGENT_FEE_PCT,
      area: villa.area,
      bedrooms: villa.bedrooms,
      askingPrice: villa.askingPrice,
      leaseholdYearsLeft: villa.leaseholdYearsLeft,
      taxStatus: 'beforeTax',
      furnished: villa.furnished,
      landRentYear: villa.landRentYear,
      region,
    })
    return e
  }, [monthlyPrice, monthlyOcc, monthlyPresets, villa, region])

  if (!hasDaily && !hasMonthly) return null

  const activeResult = tab === 'daily' ? dailyResult : monthlyResult
  const yieldPct = activeResult?.capRate ?? null
  const monthNet = activeResult ? Math.round(activeResult.noi / 12) : null
  const yearNet = activeResult ? Math.round(activeResult.noi) : null
  const paybackYears = activeResult?.payback ?? null
  const leaseYears = villa.leaseholdYearsLeft
  const canPayback = paybackYears != null && leaseYears != null && paybackYears <= leaseYears

  const yieldColor = yieldPct != null && yieldPct >= 0.05 ? 'text-[#1B6E4A]' : yieldPct != null && yieldPct < 0.02 ? 'text-[#A8362B]' : ''
  const paybackColor = canPayback ? 'text-[#1B6E4A]' : 'text-[#A8362B]'

  const fmtUsd = (n: number) => formatPrice(n, currency, lang)
  const fmtExact = (n: number) => formatPriceExact(n, currency, lang)

  const selectDaily = (key: 'p25' | 'p50' | 'p75') => {
    if (!dailyPresets) return
    setDailyPreset(key)
    setDailyPrice(dailyPresets[key])
  }
  const selectMonthly = (key: 'p25' | 'p50' | 'p75') => {
    if (!monthlyPresets) return
    setMonthlyPreset(key)
    setMonthlyPrice(monthlyPresets[key])
  }

  const chipCls = (active: boolean) =>
    `text-[13px] px-2.5 py-[7px] rounded-lg border cursor-pointer transition-colors whitespace-nowrap ${
      active
        ? 'border-[#1B6E4A] bg-[#EEF6F1] text-[#1B6E4A] font-medium'
        : 'border-[#E4E9E6] bg-white text-[#36413B] hover:bg-[#F3F7F4]'
    }`

  const tabCls = (active: boolean) =>
    `font-inherit text-[15px] pb-2.5 bg-transparent border-0 border-b-2 cursor-pointer transition-colors ${
      active
        ? 'border-[#1B6E4A] text-[#1B6E4A] font-semibold'
        : 'border-transparent text-[#4C5751] font-normal hover:text-[#18201C]'
    }`

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">
          {c.title}
        </h2>
        <span className="text-[15px] text-[#36413B]">{c.sub}</span>
      </div>

      {hasDaily && hasMonthly && (
        <div role="tablist" className="flex gap-6 border-b border-[#E4E9E6]">
          <button type="button" role="tab" aria-selected={tab === 'daily'} onClick={() => setTab('daily')} className={tabCls(tab === 'daily')}>
            {c.tabDaily}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'monthly'} onClick={() => setTab('monthly')} className={tabCls(tab === 'monthly')}>
            {c.tabMonthly}
          </button>
        </div>
      )}

      {tab === 'daily' && hasDaily && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-[14px] text-[#36413B]">{c.priceNight}</span>
              <div className="border border-[#CFD8D3] rounded-lg px-3.5 py-3 flex items-center text-[16px] focus-within:border-[#1B6E4A] focus-within:ring-1 focus-within:ring-[#1B6E4A]/30 transition-colors">
                <span className="text-[#4C5751] mr-1">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dailyPrice > 0 ? String(dailyPrice) : ''}
                  onChange={e => {
                    const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
                    setDailyPrice(Number.isFinite(n) ? n : 0)
                    setDailyPreset(null)
                  }}
                  className="w-full bg-transparent outline-none tabular-nums"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" className={chipCls(dailyPreset === 'p25')} onClick={() => selectDaily('p25')}>
                  {c.cheap}
                </button>
                <button type="button" className={chipCls(dailyPreset === 'p50')} onClick={() => selectDaily('p50')}>
                  {c.typical}
                </button>
                <button type="button" className={chipCls(dailyPreset === 'p75')} onClick={() => selectDaily('p75')}>
                  {c.expensive}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[14px] text-[#36413B]">{c.occupancy}</span>
              <div className="border border-[#CFD8D3] rounded-lg px-3.5 py-3 flex items-center text-[16px] focus-within:border-[#1B6E4A] focus-within:ring-1 focus-within:ring-[#1B6E4A]/30 transition-colors">
                <input
                  type="text"
                  inputMode="numeric"
                  value={occ > 0 ? String(occ) : ''}
                  onChange={e => {
                    const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
                    setOcc(Number.isFinite(n) && n <= 100 ? n : 0)
                  }}
                  className="w-full bg-transparent outline-none tabular-nums"
                />
                <span className="text-[#4C5751] ml-1">{c.pctSuffix}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {OCC_PRESETS.map(o => (
                  <button key={o} type="button" className={chipCls(occ === o)} onClick={() => setOcc(o)}>
                    {o}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ResultsGrid
            yieldPct={yieldPct} yieldColor={yieldColor}
            monthNet={monthNet} yearNet={yearNet}
            paybackYears={paybackYears} canPayback={canPayback} paybackColor={paybackColor}
            fmtUsd={fmtUsd} dec={dec} lang={lang}
          />

          {compareData && compareData.daily.length > 0 ? (
            <CompareButton data={compareData} lang={lang} initialTab="daily" overrideAdr={dailyPrice} overrideOcc={occ}>
              {c.dailyLink(compareData.daily.length)}
            </CompareButton>
          ) : dailyCompCount > 0 && (
            <span className="text-[15px] text-[#1B6E4A]">{c.dailyLink(dailyCompCount)}</span>
          )}
        </div>
      )}

      {tab === 'monthly' && hasMonthly && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-[14px] text-[#36413B]">{c.priceMonth}</span>
              <div className="border border-[#CFD8D3] rounded-lg px-3.5 py-3 flex items-center text-[16px] focus-within:border-[#1B6E4A] focus-within:ring-1 focus-within:ring-[#1B6E4A]/30 transition-colors">
                <span className="text-[#4C5751] mr-1">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={monthlyPrice > 0 ? String(monthlyPrice) : ''}
                  onChange={e => {
                    const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
                    setMonthlyPrice(Number.isFinite(n) ? n : 0)
                    setMonthlyPreset(null)
                  }}
                  className="w-full bg-transparent outline-none tabular-nums"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" className={chipCls(monthlyPreset === 'p25')} onClick={() => selectMonthly('p25')}>
                  {fmtUsd(monthlyPresets!.p25)}
                </button>
                <button type="button" className={chipCls(monthlyPreset === 'p50')} onClick={() => selectMonthly('p50')}>
                  {fmtUsd(monthlyPresets!.p50)}
                </button>
                <button type="button" className={chipCls(monthlyPreset === 'p75')} onClick={() => selectMonthly('p75')}>
                  {fmtUsd(monthlyPresets!.p75)}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[14px] text-[#36413B]">{c.occupancy}</span>
              <div className="border border-[#CFD8D3] rounded-lg px-3.5 py-3 flex items-center text-[16px] focus-within:border-[#1B6E4A] focus-within:ring-1 focus-within:ring-[#1B6E4A]/30 transition-colors">
                <input
                  type="text"
                  inputMode="numeric"
                  value={monthlyOcc > 0 ? String(monthlyOcc) : ''}
                  onChange={e => {
                    const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
                    setMonthlyOcc(Number.isFinite(n) && n <= 100 ? n : 0)
                  }}
                  className="w-full bg-transparent outline-none tabular-nums"
                />
                <span className="text-[#4C5751] ml-1">{c.pctSuffix}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {MONTHLY_OCC_PRESETS.map(o => (
                  <button key={o} type="button" className={chipCls(monthlyOcc === o)} onClick={() => setMonthlyOcc(o)}>
                    {o}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ResultsGrid
            yieldPct={yieldPct} yieldColor={yieldColor}
            monthNet={monthNet} yearNet={yearNet}
            paybackYears={paybackYears} canPayback={canPayback} paybackColor={paybackColor}
            fmtUsd={fmtUsd} dec={dec} lang={lang}
          />

          {monthlyPresets && (
            <span className="text-[14px] text-[#4C5751]">
              {c.monthlyAvg(villa.bedrooms, villa.district, fmtUsd(monthlyPresets.p50), kind === 'apartment')}
            </span>
          )}

          {compareData && compareData.monthly.length > 0 ? (
            <CompareButton data={compareData} lang={lang} initialTab="monthly" overrideMonthly={monthlyPrice}>
              {c.monthlyLink(compareData.monthly.length)}
            </CompareButton>
          ) : monthlyCompCount > 0 && (
            <span className="text-[15px] text-[#1B6E4A]">{c.monthlyLink(monthlyCompCount)}</span>
          )}
        </div>
      )}
    </section>
  )
}

function ResultsGrid({ yieldPct, yieldColor, monthNet, yearNet, paybackYears, canPayback, paybackColor, fmtUsd, dec, lang }: {
  yieldPct: number | null
  yieldColor: string
  monthNet: number | null
  yearNet: number | null
  paybackYears: number | null
  canPayback: boolean
  paybackColor: string
  fmtUsd: (n: number) => string
  dec: (n: number) => string
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const pctStr = yieldPct != null ? dec(yieldPct * 100) + '%' : '—'
  const paybackStr = paybackYears != null && canPayback
    ? c.approxYears(Math.round(paybackYears))
    : c.noPayback

  return (
    <div className="bg-[#F3F7F4] rounded-xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-[#4C5751]">{c.yieldLabel}</span>
        <span className={`text-[24px] font-semibold ${yieldColor}`}>{pctStr}</span>
        <span className="text-[13px] text-[#4C5751]">{c.yieldUnit}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-[#4C5751]">{c.netMonth}</span>
        <span className="text-[24px] font-semibold">{monthNet != null ? fmtUsd(monthNet) : '—'}</span>
        <span className="text-[13px] text-[#4C5751]">{c.netMonthUnit}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-[#4C5751]">{c.netYear}</span>
        <span className="text-[24px] font-semibold">{yearNet != null ? fmtUsd(yearNet) : '—'}</span>
        <span className="text-[13px] text-[#4C5751]">{c.netYearUnit}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-[#4C5751]">{c.paybackLabel}</span>
        <span className={`text-[24px] font-semibold ${paybackColor}`}>{paybackStr}</span>
      </div>
    </div>
  )
}
