'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Star, Info, AlertTriangle, Sparkles, ChevronDown, ChevronUp, TrendingUp, RotateCcw,
} from 'lucide-react'
import { InvestmentMap } from './InvestmentMap'
import { fmtMoney, fmtMoneyShort, fmtPct, fmtYears, fmtDistance, fmtMeters, pluralRu, pluralEn } from './utils'
import type { Snapshot } from './types'
import { useCurrency } from '../CurrencyContext'
import { computeEconomics, type Economics, type ScenarioKey } from '@/lib/investment/economics'
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
    inputAdr: 'ADR', inputOccupancy: 'Загрузка', inputMgmt: 'Mgmt fee',
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
    inputAdr: 'ADR', inputOccupancy: 'Occupancy', inputMgmt: 'Mgmt fee',
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
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const fmtUsdShort = (n: number | null | undefined) => fmtMoneyShort(n, currency)
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

function ConfidenceBadge({ confidence, size, lang }: { confidence: 'high' | 'medium' | 'low'; size: number; lang: Lang }) {
  const t = COPY[lang]
  const map = {
    high: { color: '#16A34A', label: t.confHigh },
    medium: { color: '#F59E0B', label: t.confMedium },
    low: { color: '#DC2626', label: t.confLow },
  }
  const c = map[confidence]
  const objPlural = pluralize(lang, size, COPY.ru.object, COPY.en.object)
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#111827]" title={c.label}>
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
      {c.label} · {size} {objPlural}
    </span>
  )
}

function InvestmentWidgetView({ snap, apiKey, lang }: { snap: Snapshot; apiKey: string; lang: Lang }) {
  const t = COPY[lang]
  const allPois = useMemo(() => [...snap.anchors.map(a => ({ lat: a.lat, lng: a.lng, name: a.name, category: a.primaryType ?? '' }))], [snap])
  return (
    <>
      <SectionShell lang={lang}>
        {snap.scenarios && <ScenariosIntro snap={snap} lang={lang} />}

        {snap.scenarios ? (
          <Scenarios snap={snap} lang={lang} />
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

        {snap.competitors.length > 0 && <CompetitorsGrid snap={snap} lang={lang} />}

        {snap.flags.emergingMarket && <EmergingBlock snap={snap} lang={lang} />}
      </SectionShell>

      <NearbyPlacesBlock snap={snap} lang={lang} />
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

function ScenariosIntro({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = COPY[lang]
  const competitorCount = snap.competitors.length
  const similar = pluralize(lang, competitorCount, COPY.ru.similarVilla, COPY.en.similarVilla)
  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-search-bg)] px-4 py-3.5 text-[13px] leading-[1.55] text-[var(--color-text)]">
      <div className="font-semibold text-[var(--color-text)] mb-1">{t.threeNumbers}</div>
      <div className="text-[var(--color-text-muted)]">
        {t.threeNumbersBody(competitorCount, similar, snap.zone.title.toLowerCase())}
        {t.threeNumbersScenarios}
      </div>
    </div>
  )
}

function Scenarios({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = COPY[lang]
  const cards: { key: ScenarioKey; title: string; tone: string }[] = [
    { key: 'bad',    title: t.scenarioBad,    tone: 'border-[#FECACA] bg-[#FEF2F2]' },
    { key: 'median', title: t.scenarioMedian, tone: 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' },
    { key: 'good',   title: t.scenarioGood,   tone: 'border-[#BBF7D0] bg-[#F0FDF4]' },
  ]
  return (
    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map(c => (
        <ScenarioCard key={c.key} sKey={c.key} title={c.title} tone={c.tone} snap={snap} lang={lang} />
      ))}
    </div>
  )
}

function ScenarioCard({
  sKey, title, tone, snap, lang,
}: {
  sKey: ScenarioKey; title: string; tone: string; snap: Snapshot; lang: Lang
}) {
  const t = COPY[lang]
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const fxRate = CURRENCY_RATES[currency]
  const baseline = snap.scenarios![sKey]

  const [adrUsd, setAdrUsd] = useState<number>(baseline.adr)
  const [occupancyPct, setOccupancyPct] = useState<number>(Math.round(baseline.occupancy * 100))
  const [mgmtFeePct, setMgmtFeePct] = useState<number>(Math.round(snap.region.mgmtFeePct * 100))
  const [open, setOpen] = useState(false)

  const adrInCurrency = Math.round(adrUsd * fxRate)
  const setAdrInCurrency = (n: number) => setAdrUsd(Math.max(1, Math.round(n / fxRate)))

  const e: Economics = useMemo(() => computeEconomics({
    adr: adrUsd,
    occupancy: occupancyPct / 100,
    area: snap.villa.area,
    askingPrice: snap.villa.askingPrice,
    leaseholdYearsLeft: snap.villa.leaseholdYearsLeft,
    region: { ...snap.region, mgmtFeePct: mgmtFeePct / 100 },
  }), [adrUsd, occupancyPct, mgmtFeePct, snap])

  const isCustom =
    adrUsd !== baseline.adr ||
    occupancyPct !== Math.round(baseline.occupancy * 100) ||
    mgmtFeePct !== Math.round(snap.region.mgmtFeePct * 100)

  const reset = () => {
    setAdrUsd(baseline.adr)
    setOccupancyPct(Math.round(baseline.occupancy * 100))
    setMgmtFeePct(Math.round(snap.region.mgmtFeePct * 100))
  }
  const opexUnit = lang === 'en' ? '$/m²/mo' : '$/м²/мес'

  return (
    <div className={`rounded-2xl border-2 ${tone} p-5 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-wide font-semibold text-[#111827]">{title}</div>
        {isCustom && (
          <button
            type="button"
            onClick={reset}
            title={t.resetTitle}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <RotateCcw size={11} /> {t.reset}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <ScenarioInput label={t.inputAdr} value={adrInCurrency} onChange={setAdrInCurrency} suffix={currency} step={Math.max(1, Math.round(5 * fxRate))} />
        <ScenarioInput label={t.inputOccupancy} value={occupancyPct} onChange={n => setOccupancyPct(Math.min(100, Math.max(0, n)))} suffix="%" step={1} />
        <ScenarioInput label={t.inputMgmt} value={mgmtFeePct} onChange={n => setMgmtFeePct(Math.min(50, Math.max(0, n)))} suffix="%" step={1} />
      </div>

      <div className="pt-2 border-t border-[var(--color-border)]">
        <div className="text-[24px] font-semibold text-[#111827] leading-tight">
          {fmtUsd(e.noi)}
          <span className="text-[13px] font-normal text-[var(--color-text-muted)]">{t.perYearNoi}</span>
        </div>
        <div className="text-[13px] text-[var(--color-text-muted)] mt-2 space-y-0.5">
          <div>{t.payback}: <span className="text-[#111827] font-medium">{fmtYears(e.payback, lang)}</span></div>
          <div>{t.capRate}: <span className="text-[#111827] font-medium">{fmtPct(e.capRate)}</span></div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-[12px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] cursor-pointer"
      >
        {t.howCalced} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <ul className="text-[12px] text-[var(--color-text)] space-y-0.5 border-t border-[var(--color-border)] pt-2">
          <li>{t.revenue}: {fmtUsd(e.revenue)}</li>
          <li>− {t.platform} ({Math.round(snap.region.platformFeePct * 100)}%): {fmtUsd(e.platformFee)}</li>
          <li>− {t.mgmt} ({mgmtFeePct}%): {fmtUsd(e.mgmtFee)}</li>
          <li>− {t.opex} ({snap.region.opexPerSqmMonth} {opexUnit}): {fmtUsd(e.opex)}</li>
          <li>− {t.tax} ({Math.round(snap.region.taxRate * 100)}%): {fmtUsd(e.tax)}</li>
          <li className="pt-1 border-t border-[var(--color-border)] mt-1 font-medium">= {t.noi}: {fmtUsd(e.noi)}</li>
        </ul>
      )}
    </div>
  )
}

function ScenarioInput({
  label, value, onChange, suffix, step,
}: {
  label: string; value: number; onChange: (v: number) => void; suffix: string; step: number
}) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="text-[var(--color-text-muted)] w-[64px] shrink-0">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={e => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(n)
        }}
        step={step}
        className="flex-1 min-w-0 rounded-md border border-black/10 bg-transparent px-2 py-1 text-[16px] md:text-[13px] tabular-nums text-[#111827] focus:outline-none focus:border-[var(--color-primary)] focus:bg-white/40"
      />
      <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">{suffix}</span>
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

function CompetitorsGrid({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = COPY[lang]
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const [showAll, setShowAll] = useState(false)
  const list = showAll ? snap.competitors : snap.competitors.slice(0, 9)
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[18px] md:text-[20px] font-semibold text-[#111827]">{t.similarOnBooking(snap.competitors.length)}</h3>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(c => (
          <li key={c.id}>
            <a href={c.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="block rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden no-underline text-[#111827] hover:border-[var(--color-primary)]">
              {c.photo ? (
                <div className="relative w-full h-[140px]">
                  <Image src={c.photo} alt={c.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                </div>
              ) : (
                <div className="w-full h-[140px] bg-[var(--color-search-bg)] flex items-center justify-center text-3xl">🏨</div>
              )}
              <div className="p-3">
                <div className="text-[14px] font-semibold leading-snug line-clamp-2 mb-1">{c.complex || c.name}</div>
                <div className="text-[12px] text-[var(--color-text-muted)] mb-2 flex items-center gap-2">
                  {c.bedrooms != null && <span>{c.bedrooms} BR</span>}
                  {c.area != null && <span>· {c.area} {t.sqm}</span>}
                  <span>· {fmtDistance(c.distanceKm, lang)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold text-[#1D4ED8]">{fmtUsd(c.adr)}<span className="text-[11px] font-normal text-[var(--color-text-muted)]">{t.perNight}</span></div>
                  {c.rating != null && (
                    <div className="text-[12px] inline-flex items-center gap-1">
                      <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                      <span className="font-medium">{c.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
      {snap.competitors.length > 9 && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="mt-4 inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-[13px] font-medium hover:border-[var(--color-primary)] cursor-pointer"
        >
          {showAll ? t.collapse : t.showAll(snap.competitors.length)}
        </button>
      )}
    </section>
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

function getCatMeta(lang: Lang): Record<string, { title: string; icon: string; limit: number }> {
  const t = COPY[lang]
  return {
    beach: { title: t.catBeach, icon: '🏝️', limit: 5 },
    beachclub: { title: t.catBeachclub, icon: '🏖️', limit: 5 },
    restaurant: { title: t.catRestaurant, icon: '🍽️', limit: 6 },
    cafe: { title: t.catCafe, icon: '☕️', limit: 6 },
    wellness: { title: t.catWellness, icon: '🧘', limit: 5 },
    nightlife: { title: t.catNightlife, icon: '🍸', limit: 5 },
    attraction: { title: t.catAttraction, icon: '✨', limit: 5 },
    international_school: { title: t.catIntlSchool, icon: '🎓', limit: 5 },
    school: { title: t.catSchool, icon: '🏫', limit: 5 },
    preschool: { title: t.catPreschool, icon: '🧸', limit: 5 },
    supermarket: { title: t.catSupermarket, icon: '🛒', limit: 5 },
    pharmacy: { title: t.catPharmacy, icon: '💊', limit: 5 },
    hospital: { title: t.catHospital, icon: '🏥', limit: 5 },
  }
}

function NearbyPlacesBlock({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = COPY[lang]
  const CAT_META = getCatMeta(lang)
  const ORDER = [
    'beach', 'beachclub',
    'international_school', 'school', 'preschool',
    'wellness',
    'restaurant', 'cafe',
    'supermarket', 'pharmacy', 'hospital',
    'nightlife', 'attraction',
  ]
  const isWarung = (name: string | null) => /\bwarung\b/i.test(name ?? '')
  const wellRated = (p: { rating: number | null; reviews: number | null }, hi: number, hiRev: number, lo: number, loRev: number) =>
    ((p.rating ?? 0) >= hi && (p.reviews ?? 0) >= hiRev) ||
    ((p.rating ?? 0) >= lo && (p.reviews ?? 0) >= loRev)
  const QUALITY: Record<string, (p: { name: string | null; rating: number | null; reviews: number | null }) => boolean> = {
    beach:       p => (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 100,
    beachclub:   p => !isWarung(p.name) && /beach/i.test(p.name ?? '') && wellRated(p, 4.3, 100, 4.0, 500),
    wellness:    p => wellRated(p, 4.6, 50, 4.3, 500),
    restaurant:  p => !isWarung(p.name) && wellRated(p, 4.5, 100, 4.2, 1000),
    cafe:        p => !isWarung(p.name) && wellRated(p, 4.6, 50, 4.3, 500),
    nightlife:   p => !isWarung(p.name) && wellRated(p, 4.4, 100, 4.1, 500),
    attraction:  p => wellRated(p, 4.6, 300, 4.3, 2000),
    international_school: p => (p.reviews ?? 0) >= 10,
    school:      p => (p.rating ?? 0) >= 4.2 && (p.reviews ?? 0) >= 30,
    preschool:   p => (p.rating ?? 0) >= 4.3 && (p.reviews ?? 0) >= 15,
    supermarket: p => (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 50,
    pharmacy:    p => (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 20,
    hospital:    p => (p.rating ?? 0) >= 4.0 && (p.reviews ?? 0) >= 30,
  }
  const seen = new Set<string>()
  const filtered: Record<string, typeof snap.nearbyByCategory[string]> = {}
  for (const cat of ORDER) {
    const list = snap.nearbyByCategory[cat] ?? []
    const qualityFn = QUALITY[cat] ?? (() => true)
    const out: typeof list = []
    for (const p of list) {
      if (!qualityFn(p)) continue
      const idKey = `id:${p.id}`
      const nameKey = `n:${(p.name ?? '').toLowerCase().trim()}`
      if (seen.has(idKey) || (p.name && seen.has(nameKey))) continue
      seen.add(idKey)
      if (p.name) seen.add(nameKey)
      out.push(p)
    }
    if (out.length > 0) filtered[cat] = out
  }
  const cats = ORDER.filter(k => (filtered[k] ?? []).length > 0)
  if (cats.length === 0) return null
  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-[18px] md:text-[20px] font-semibold text-[#111827]">{t.nearbyTitle}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map(cat => {
          const meta = CAT_META[cat]
          const items = [...(filtered[cat] ?? [])]
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, meta.limit)
          return (
            <div key={cat} className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[18px]">{meta.icon}</span>
                <span className="text-[14px] font-semibold text-[#111827]">{meta.title}</span>
                <span className="text-[12px] text-[var(--color-text-muted)] ml-auto">
                  {(filtered[cat] ?? []).length}
                </span>
              </div>
              <ul className="space-y-2">
                {items.map(p => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <a
                      href={p.mapsUrl ?? undefined}
                      target={p.mapsUrl ? '_blank' : undefined}
                      rel={p.mapsUrl ? 'noopener noreferrer' : undefined}
                      className={`min-w-0 truncate text-[#111827] ${p.mapsUrl ? 'hover:text-[var(--color-primary-pressed)]' : ''} no-underline`}
                      title={p.name ?? ''}
                    >
                      {p.name}
                    </a>
                    <span className="shrink-0 inline-flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
                      {p.rating != null && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star size={11} className="text-[#F59E0B] fill-[#F59E0B]" />
                          <span className="font-medium text-[#111827]">{p.rating.toFixed(1)}</span>
                        </span>
                      )}
                      <span>{fmtDistance(p.distanceKm, lang)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
