'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Info, ChevronDown, ChevronUp, TrendingUp,
} from 'lucide-react'
import { InvestmentMap } from './InvestmentMap'
import { fmtMoney, fmtPct, fmtYears, fmtDistance, pluralRu, pluralEn } from './utils'
import type { Snapshot } from './types'
import { useCurrency } from '../CurrencyContext'
import { computeEconomics, type Economics } from '@/lib/investment/economics'
import { CURRENCY_RATES } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    sectionH2: 'Инвестиционный потенциал',
    sectionSub: 'Оценка сценариев аренды по матчингу с Booking-конкурентами и анализу района',
    confHigh: 'высокая уверенность',
    confMedium: 'средняя уверенность',
    confLow: 'низкая уверенность',
    object: ['объект', 'объекта', 'объектов'] as [string, string, string],
    villa: ['вилла', 'виллы', 'вилл'] as [string, string, string],
    similarVilla: ['похожая вилла', 'похожие виллы', 'похожих вилл'] as [string, string, string],
    restaurant: ['ресторан', 'ресторана', 'ресторанов'] as [string, string, string],
    perNight: ' / ночь',
    perYear: '/год',
    perYearNoi: ' / год NOI',
    expandedZone: (raw: string, applied: string) =>
      `Расширенная выборка: в исходной зоне (${raw}) не нашлось матчей, перешли на ${applied}.`,
    threeNumbers: 'Что значат эти три цифры',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>Считаем, сколько эта вилла может зарабатывать на посуточной аренде. За основу — {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'похожие виллы'} в той же зоне ({zoneLower}; на карте сверху — синие точки внутри красного круга).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Плохой</strong> — пессимистичный прогноз, вилла стоит полупустой.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Нормальный</strong> — то, что бывает чаще всего.{' '}
        <strong className="text-[#15803D]">Хороший</strong> — потолок, если работать с управляющей компанией и держать высокий рейтинг.
        {' '}Под сценариями есть карточки тех самых конкурентов — можно открыть и сравнить площадь / рейтинг / цену с этой виллой.
      </>,
    scenarioBad: 'Плохой', scenarioMedian: 'Нормальный', scenarioGood: 'Хороший',
    resetTitle: 'Сбросить к данным по конкурентам', reset: 'сбросить',
    inputPrice: 'Цена', inputAdr: 'ADR', inputOccupancy: 'Загрузка', inputMgmt: 'Mgmt fee',
    calcTitle: 'Калькулятор доходности',
    calcSub: 'Подвигайте ползунки. ADR и загрузка по умолчанию — медиана по похожим объектам на Booking поблизости; цену можно менять ±25%.',
    payback: 'Окупаемость', capRate: 'Cap rate',
    howCalced: 'Как считалось',
    revenue: 'Revenue', platform: 'Platform', mgmt: 'Mgmt', opex: 'OPEX', tax: 'Tax', noi: 'NOI',
    referencesTitle: 'Малая выборка — показываем референсы',
    referencesBody: (n: number, plural: string) =>
      `В радиусе 2км нашлось всего ${n} ${plural}, подходящих под характеристики виллы. Агрегаты не считаем — даём конкретные примеры.`,
    sqm: 'м²',
    similarOnBooking: (n: number) => `Похожие объекты на Booking · ${n}`,
    collapse: 'Свернуть',
    showAll: (n: number) => `Показать все ${n}`,
    newDistrictH3: 'Новый район',
    newDistrictBody:
      'Район в фазе раннего развития: в радиусе 1км менее 30 листингов на Booking. По траектории сопоставимых рынков (Berawa 2018→2022, Canggu 2014→2018) ADR может вырасти на 30–80% за 4–5 лет. Это историческая аналогия, не прогноз.',
    newDistrictFootnote: (n: number, plural: string) =>
      `Локально в радиусе 1км: ${n} ${plural} в общей сложности`,
    nearbyTitle: 'Что вокруг виллы',
    catBeach: 'Пляжи', catBeachclub: 'Beach clubs', catRestaurant: 'Рестораны',
    catCafe: 'Кафе', catWellness: 'Йога и фитнес', catNightlife: 'Бары и клубы',
    catAttraction: 'Достопримечательности', catIntlSchool: 'Международные школы',
    catSchool: 'Школы', catPreschool: 'Сады и ясли', catSupermarket: 'Магазины',
    catPharmacy: 'Аптеки', catHospital: 'Клиники',
  },
  en: {
    sectionH2: 'Investment potential',
    sectionSub: 'Rental scenarios estimated by matching against Booking competitors and analysing the area',
    confHigh: 'high confidence',
    confMedium: 'medium confidence',
    confLow: 'low confidence',
    object: ['listing', 'listings'] as [string, string],
    villa: ['villa', 'villas'] as [string, string],
    similarVilla: ['similar villa', 'similar villas'] as [string, string],
    restaurant: ['restaurant', 'restaurants'] as [string, string],
    perNight: ' / night',
    perYear: '/yr',
    perYearNoi: ' / year NOI',
    expandedZone: (raw: string, applied: string) =>
      `Expanded sample: no matches in the original zone (${raw}), switched to ${applied}.`,
    threeNumbers: 'What these three numbers mean',
    threeNumbersBody: (count: number, similar: string, zoneLower: string) =>
      <>We estimate what this villa could earn from short-term rentals. The baseline comes from {count > 0 ? <><span className="font-medium text-[var(--color-text)]">{count}</span> {similar}</> : 'similar villas'} in the same zone ({zoneLower}; on the map above — blue dots inside the red circle).</>,
    threeNumbersScenarios:
      <>
        {' '}<strong className="text-[#B91C1C]">Bad</strong> — pessimistic case, villa sits half empty.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Normal</strong> — what tends to happen most often.{' '}
        <strong className="text-[#15803D]">Good</strong> — upper bound, with a strong management company and a high rating.
        {' '}Below the scenarios are the actual competitor cards — open them to compare area / rating / price with this villa.
      </>,
    scenarioBad: 'Bad', scenarioMedian: 'Normal', scenarioGood: 'Good',
    resetTitle: 'Reset to competitor-based defaults', reset: 'reset',
    inputPrice: 'Price', inputAdr: 'ADR', inputOccupancy: 'Occupancy', inputMgmt: 'Mgmt fee',
    calcTitle: 'Yield calculator',
    calcSub: 'Drag the sliders. ADR and occupancy default to the median of similar nearby Booking listings; the price can be adjusted ±25%.',
    payback: 'Payback', capRate: 'Cap rate',
    howCalced: 'How it was calculated',
    revenue: 'Revenue', platform: 'Platform', mgmt: 'Mgmt', opex: 'OPEX', tax: 'Tax', noi: 'NOI',
    referencesTitle: 'Small sample — showing reference listings',
    referencesBody: (n: number, plural: string) =>
      `Only ${n} ${plural} matched the villa's profile within a 2 km radius. We're not aggregating — here are concrete examples instead.`,
    sqm: 'm²',
    similarOnBooking: (n: number) => `Similar listings on Booking · ${n}`,
    collapse: 'Collapse',
    showAll: (n: number) => `Show all ${n}`,
    newDistrictH3: 'Emerging district',
    newDistrictBody:
      'The district is in an early growth phase: fewer than 30 Booking listings within a 1 km radius. Following the trajectory of comparable markets (Berawa 2018→2022, Canggu 2014→2018) ADR can rise 30–80% over 4–5 years. This is a historical analogy, not a forecast.',
    newDistrictFootnote: (n: number, plural: string) =>
      `In total within a 1 km radius: ${n} ${plural}`,
    nearbyTitle: 'Around the villa',
    catBeach: 'Beaches', catBeachclub: 'Beach clubs', catRestaurant: 'Restaurants',
    catCafe: 'Cafés', catWellness: 'Yoga & fitness', catNightlife: 'Bars & clubs',
    catAttraction: 'Attractions', catIntlSchool: 'International schools',
    catSchool: 'Schools', catPreschool: 'Nurseries & preschools', catSupermarket: 'Supermarkets',
    catPharmacy: 'Pharmacies', catHospital: 'Clinics',
  },
} as const

function pluralize(lang: Lang, n: number, ruForms: [string, string, string], enForms: [string, string]): string {
  return lang === 'en' ? pluralEn(n, enForms) : pluralRu(n, ruForms)
}

export function InvestmentWidget({
  villaId,
  apiKey,
  kind = 'villa',
  lang,
}: { villaId: string; apiKey: string; kind?: 'villa' | 'apartment'; lang?: Lang }) {
  // Allow explicit lang from server caller; default by URL.
  const pathname = usePathname() ?? ''
  const resolvedLang: Lang = lang ?? (pathname.startsWith('/en') ? 'en' : 'ru')
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const apiBase = kind === 'apartment' ? '/api/apartament' : '/api/villa'
    fetch(`${apiBase}/${villaId}/investment-snapshot`)
      .then(async r => {
        if (!r.ok) throw new Error(`http_${r.status}`)
        return r.json() as Promise<Snapshot>
      })
      .then(s => { if (!cancelled) setSnap(s) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [villaId, kind])

  if (loading) return <SectionShell lang={resolvedLang}><Skeleton /></SectionShell>
  if (error || !snap) return null

  return <InvestmentWidgetView snap={snap} apiKey={apiKey} lang={resolvedLang} />
}

function SectionShell({ children, lang }: { children: React.ReactNode; lang: Lang }) {
  const t = COPY[lang]
  // mt-12 gives the heading breathing room from the white ContactBlock /
  // ManagerCard cards that sit immediately above on every detail page —
  // without it, the h2 was visually touching the contact card's bottom
  // edge and looked unindented.
  return (
    <section className="mt-12 mb-10" data-investment-block>
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
        {t.sectionH2}
      </h2>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
        {t.sectionSub}
      </div>
      {children}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 rounded-2xl bg-[var(--color-search-bg)] animate-pulse" />
      <div className="h-[480px] rounded-3xl bg-[var(--color-search-bg)] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <div key={i} className="h-32 rounded-2xl bg-[var(--color-search-bg)] animate-pulse" />)}
      </div>
    </div>
  )
}

function InvestmentWidgetView({ snap, apiKey, lang }: { snap: Snapshot; apiKey: string; lang: Lang }) {
  const t = COPY[lang]
  const allPois = useMemo(() => {
    const out: { lat: number; lng: number; name: string | null; category: string }[] = []
    for (const [cat, list] of Object.entries(snap.nearbyByCategory)) {
      for (const p of list) out.push({ lat: p.lat, lng: p.lng, name: p.name, category: cat })
    }
    return out
  }, [snap])
  return (
    <>
      <SectionShell lang={lang}>
        {snap.scenarios ? (
          <Calculator snap={snap} lang={lang} />
        ) : snap.references ? (
          <References snap={snap} lang={lang} />
        ) : null}

        <div className="mt-4">
          <InvestmentMap apiKey={apiKey} snap={snap} allPois={allPois} lang={lang} />
        </div>

        {snap.flags.expandedZone && (
          <Banner tone="info" icon={<Info size={16} />} className="mt-4">
            {t.expandedZone(snap.zone.raw, snap.zone.applied)}
          </Banner>
        )}

        {snap.flags.emergingMarket && <EmergingBlock snap={snap} lang={lang} />}
      </SectionShell>
    </>
  )
}

function Banner({ tone, icon, children, className }: { tone: 'info' | 'danger' | 'warn'; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  const map = {
    info: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]',
    danger: 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]',
    warn: 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]',
  }
  return (
    <div className={`rounded-2xl border ${map[tone]} px-4 py-3 text-[13px] flex items-start gap-2 ${className ?? ''}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function Calculator({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = COPY[lang]
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const fxRate = CURRENCY_RATES[currency]
  const sc = snap.scenarios!
  const basePrice = snap.villa.askingPrice

  // ADR slider band derived from the competitor percentiles (p25…p75),
  // widened so the user can explore a bit beyond the observed range.
  const adrLo = Math.max(1, Math.floor(sc.bad.adr * 0.6))
  const adrHi = Math.max(adrLo + 1, Math.ceil(sc.good.adr * 1.5))

  const [price, setPrice] = useState<number>(basePrice ?? 0)
  const [adr, setAdr] = useState<number>(sc.median.adr)
  const [occ, setOcc] = useState<number>(Math.round(snap.region.occupancyByScenario.median * 100))
  const [mgmt, setMgmt] = useState<number>(Math.round(snap.region.mgmtFeePct * 100))
  const [open, setOpen] = useState(false)

  const e: Economics = useMemo(() => computeEconomics({
    adr,
    occupancy: occ / 100,
    area: snap.villa.area,
    askingPrice: basePrice != null ? price : null,
    leaseholdYearsLeft: snap.villa.leaseholdYearsLeft,
    region: { ...snap.region, mgmtFeePct: mgmt / 100 },
  }), [adr, occ, mgmt, price, basePrice, snap])

  const priceLo = basePrice != null ? Math.round(basePrice * 0.75) : 0
  const priceHi = basePrice != null ? Math.round(basePrice * 1.25) : 0
  const opexUnit = lang === 'en' ? '$/m²/mo' : '$/м²/мес'

  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="text-[16px] font-semibold text-[#111827]">{t.calcTitle}</div>
      <div className="text-[13px] text-[var(--color-text-muted)] mt-1 mb-5">{t.calcSub}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {basePrice != null && (
          <Slider label={t.inputPrice} value={price} min={priceLo} max={priceHi} step={500}
            onChange={setPrice} display={fmtUsd(Math.round(price * fxRate))} />
        )}
        <Slider label={t.inputAdr} value={adr} min={adrLo} max={adrHi} step={1}
          onChange={setAdr} display={fmtUsd(Math.round(adr * fxRate))} />
        <Slider label={t.inputOccupancy} value={occ} min={0} max={100} step={1}
          onChange={setOcc} display={`${occ}%`} />
        <Slider label={t.inputMgmt} value={mgmt} min={0} max={80} step={1}
          onChange={setMgmt} display={`${mgmt}%`} />
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <div className="text-[30px] font-semibold text-[#111827] leading-none">
          {fmtUsd(e.noi)}<span className="text-[14px] font-normal text-[var(--color-text-muted)]">{t.perYearNoi}</span>
        </div>
        <div className="text-[13px] text-[var(--color-text-muted)]">{t.payback}: <span className="text-[#111827] font-medium">{fmtYears(e.payback, lang)}</span></div>
        <div className="text-[13px] text-[var(--color-text-muted)]">{t.capRate}: <span className="text-[#111827] font-medium">{fmtPct(e.capRate)}</span></div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="mt-3 inline-flex items-center gap-1 text-[12px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] cursor-pointer"
      >
        {t.howCalced} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <ul className="mt-2 text-[12px] text-[var(--color-text)] space-y-0.5 border-t border-[var(--color-border)] pt-2">
          <li>{t.revenue}: {fmtUsd(e.revenue)}</li>
          <li>− {t.platform} ({Math.round(snap.region.platformFeePct * 100)}%): {fmtUsd(e.platformFee)}</li>
          <li>− {t.mgmt} ({mgmt}%): {fmtUsd(e.mgmtFee)}</li>
          <li>− {t.opex} ({snap.region.opexPerSqmMonth} {opexUnit}): {fmtUsd(e.opex)}</li>
          <li>− {t.tax} ({Math.round(snap.region.taxRate * 100)}%): {fmtUsd(e.tax)}</li>
          <li className="pt-1 border-t border-[var(--color-border)] mt-1 font-medium">= {t.noi}: {fmtUsd(e.noi)}</li>
        </ul>
      )}
    </div>
  )
}

function Slider({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string
}) {
  const clamped = Math.min(max, Math.max(min, value))
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[var(--color-text-muted)]">{label}</span>
        <span className="text-[15px] font-semibold text-[#111827] tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        onChange={ev => onChange(Number(ev.target.value))}
        className="w-full h-1.5 cursor-pointer accent-[var(--color-primary)]"
      />
    </div>
  )
}


function References({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = COPY[lang]
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const plural = pluralize(lang, snap.matchSampleSize, COPY.ru.object, COPY.en.object)
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-5">
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide font-semibold text-[#111827] mb-2">
        <Info size={14} /> {t.referencesTitle}
      </div>
      <div className="text-[13px] text-[var(--color-text-muted)] mb-4">
        {t.referencesBody(snap.matchSampleSize, plural)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(snap.references ?? []).map(r => (
          <a key={r.id} href={r.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="rounded-xl border border-[var(--color-border)] p-3 hover:border-[var(--color-primary)] no-underline text-[#111827]">
            <div className="text-[14px] font-semibold leading-snug line-clamp-2">{r.complex || r.name}</div>
            <div className="text-[12px] text-[var(--color-text-muted)] mt-1">
              {r.bedrooms ?? '?'} BR{r.area ? ` · ${r.area} ${t.sqm}` : ''} · {fmtDistance(r.distanceKm, lang)}
            </div>
            <div className="text-[15px] font-semibold text-[#1D4ED8] mt-2">{fmtUsd(r.adr)}<span className="text-[11px] text-[var(--color-text-muted)] font-normal">{t.perNight}</span></div>
          </a>
        ))}
      </div>
    </div>
  )
}


function EmergingBlock({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = COPY[lang]
  const plural = pluralize(lang, snap.totalCompetitorsInRadius, COPY.ru.object, COPY.en.object)
  return (
    <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide font-semibold text-[#111827] mb-2">
        <TrendingUp size={14} className="text-[var(--color-primary)]" /> {t.newDistrictH3}
      </div>
      <div className="text-[14px] text-[var(--color-text)] leading-relaxed">
        {t.newDistrictBody}
      </div>
      <div className="text-[12px] text-[var(--color-text-muted)] mt-3">
        {t.newDistrictFootnote(snap.totalCompetitorsInRadius, plural)}
      </div>
    </section>
  )
}
