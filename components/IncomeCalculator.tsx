'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { computeEconomics } from '@/lib/investment/economics'
import { computeMonthlyEconomics, AGENT_FEE_PCT, MONTHS_RENTED } from '@/lib/investment/monthly'
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
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string) =>
      `Средняя ставка для вилл${bedrooms ? ` с ${bedrooms} ${pluralRu(bedrooms, ['спальней', 'спальнями', 'спальнями'])}` : ''}${district ? `, район ${district}` : ''} — ${price}/мес.`,
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
    monthlyAvg: (bedrooms: number | null, district: string | null, price: string) =>
      `Average rate for${bedrooms ? ` ${bedrooms}-bedroom` : ''} villas${district ? ` in ${district}` : ''} — ${price}/mo.`,
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
}

const OCC_PRESETS = [60, 75, 90] as const

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
  compareData,
}: CalcProps) {
  const { currency } = useCurrency()
  const c = pickCopy(COPY, lang)
  const dec = (x: number) => (lang === 'en' || lang === 'zh' ? x.toFixed(1) : x.toFixed(1).replace('.', ','))

  const hasDaily = !!dailyPresets && !restricted
  const hasMonthly = !!monthlyPresets
  const defaultTab = hasDaily ? 'daily' : hasMonthly ? 'monthly' : null
  const [tab, setTab] = useState<'daily' | 'monthly'>(defaultTab ?? 'daily')

  const [dailyPrice, setDailyPrice] = useState(dailyPresets?.p50 ?? 0)
  const [dailyPreset, setDailyPreset] = useState<'p25' | 'p50' | 'p75'>('p50')
  const [occ, setOcc] = useState(nearestOcc(defaultOccupancyPct))
  const [monthlyPrice, setMonthlyPrice] = useState(monthlyPresets?.p50 ?? 0)
  const [monthlyPreset, setMonthlyPreset] = useState<'p25' | 'p50' | 'p75'>('p50')

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
      taxStatus: 'nonResident',
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
      monthsRented: MONTHS_RENTED.median,
      agentFeePct: AGENT_FEE_PCT,
      area: villa.area,
      bedrooms: villa.bedrooms,
      askingPrice: villa.askingPrice,
      leaseholdYearsLeft: villa.leaseholdYearsLeft,
      taxStatus: 'nonResident',
      furnished: villa.furnished,
      landRentYear: villa.landRentYear,
      region,
    })
    return e
  }, [monthlyPrice, monthlyPresets, villa, region])

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
              <div className="border border-[#CFD8D3] rounded-lg px-3.5 py-3 flex justify-between text-[16px]">
                <span>{fmtExact(dailyPrice)}</span>
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
              <div className="border border-[#CFD8D3] rounded-lg px-3.5 py-3 flex justify-between text-[16px]">
                <span>{occ}</span>
                <span className="text-[#4C5751]">{c.pctSuffix}</span>
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
            <CompareButton data={compareData} lang={lang} initialTab="daily" overrideAdr={dailyPrice} overrideOcc={occ} className="border-[#1B6E4A] text-[#1B6E4A] hover:bg-[#1B6E4A]/5">
              {pickCopy({ ru: `Соседи, которые сдают посуточно: ${compareData.daily.length} ${pluralRu(compareData.daily.length, ['объект', 'объекта', 'объектов'])}`, en: `Neighbours renting nightly: ${compareData.daily.length}` }, lang)}
            </CompareButton>
          ) : dailyCompCount > 0 && (
            <span className="text-[15px] text-[#1B6E4A]">{c.dailyLink(dailyCompCount)}</span>
          )}
        </div>
      )}

      {tab === 'monthly' && hasMonthly && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] text-[#36413B]">{c.priceMonth}</span>
            <div className="border border-[#CFD8D3] rounded-lg px-3.5 py-3 flex justify-between text-[16px]">
              <span>{fmtExact(monthlyPrice)}</span>
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

          <ResultsGrid
            yieldPct={yieldPct} yieldColor={yieldColor}
            monthNet={monthNet} yearNet={yearNet}
            paybackYears={paybackYears} canPayback={canPayback} paybackColor={paybackColor}
            fmtUsd={fmtUsd} dec={dec} lang={lang}
          />

          {monthlyPresets && (
            <span className="text-[14px] text-[#4C5751]">
              {c.monthlyAvg(villa.bedrooms, villa.district, fmtUsd(monthlyPresets.p50))}
            </span>
          )}

          {compareData && compareData.monthly.length > 0 ? (
            <CompareButton data={compareData} lang={lang} initialTab="monthly" overrideMonthly={monthlyPrice} className="border-[#1B6E4A] text-[#1B6E4A] hover:bg-[#1B6E4A]/5">
              {pickCopy({ ru: `Соседи, которые сдают помесячно: ${compareData.monthly.length} ${pluralRu(compareData.monthly.length, ['объект', 'объекта', 'объектов'])}`, en: `Neighbours renting monthly: ${compareData.monthly.length}` }, lang)}
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
