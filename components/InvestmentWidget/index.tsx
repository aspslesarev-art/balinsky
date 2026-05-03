'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Star, Info, AlertTriangle, Sparkles, ChevronDown, ChevronUp, TrendingUp,
} from 'lucide-react'
import { InvestmentMap } from './InvestmentMap'
import { fmtMoney, fmtMoneyShort, fmtPct, fmtYears, fmtDistance, fmtMeters, pluralRu } from './utils'
import type { Snapshot } from './types'
import { useCurrency } from '../CurrencyContext'

export function InvestmentWidget({
  villaId,
  apiKey,
  kind = 'villa',
}: { villaId: string; apiKey: string; kind?: 'villa' | 'apartment' }) {
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

  if (loading) return <SectionShell><Skeleton /></SectionShell>
  if (error || !snap) return null

  return <InvestmentWidgetView snap={snap} apiKey={apiKey} />
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    // data-investment-block lets the intent toggle hide this whole
    // section in "Для жизни" mode without removing it from SSR HTML.
    <section className="mb-10" data-investment-block>
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
        Инвестиционный потенциал
      </h2>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
        Оценка сценариев аренды по матчингу с Booking-конкурентами и анализу района
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

function ConfidenceBadge({ confidence, size }: { confidence: 'high' | 'medium' | 'low'; size: number }) {
  const map = {
    high: { color: '#16A34A', label: 'высокая уверенность' },
    medium: { color: '#F59E0B', label: 'средняя уверенность' },
    low: { color: '#DC2626', label: 'низкая уверенность' },
  }
  const c = map[confidence]
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#111827]" title={c.label}>
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
      {c.label} · {size} {pluralRu(size, ['объект', 'объекта', 'объектов'])}
    </span>
  )
}

function InvestmentWidgetView({ snap, apiKey }: { snap: Snapshot; apiKey: string }) {
  const allPois = useMemo(() => [...snap.anchors.map(a => ({ lat: a.lat, lng: a.lng, name: a.name, category: a.primaryType ?? '' }))], [snap])
  return (
    <>
      {/* Investment-only block: scenarios + map + comparables. SectionShell
          carries data-investment-block so the intent toggle hides the whole
          wrapper in "Для жизни" mode. */}
      <SectionShell>
        {snap.scenarios && <ScenariosIntro snap={snap} />}

        {snap.scenarios ? (
          <Scenarios snap={snap} />
        ) : snap.references ? (
          <References snap={snap} />
        ) : null}

        <div className="mt-4">
          <InvestmentMap apiKey={apiKey} snap={snap} allPois={allPois} />
        </div>

        {snap.flags.expandedZone && (
          <Banner tone="info" icon={<Info size={16} />} className="mt-4">
            Расширенная выборка: в исходной зоне ({snap.zone.raw}) не нашлось матчей, перешли на {snap.zone.applied}.
          </Banner>
        )}

        {snap.competitors.length > 0 && <CompetitorsGrid snap={snap} />}

        {snap.flags.emergingMarket && <EmergingBlock snap={snap} />}
      </SectionShell>

      {/* "Что вокруг" lives outside the investment wrapper so it stays
          visible in "Для жизни" mode — it's useful for living-buyers
          (схools, рестораны, пляжи), not just investors. */}
      <NearbyPlacesBlock snap={snap} />
    </>
  )
}

function Verdict({ snap }: { snap: Snapshot }) {
  const { currency } = useCurrency()
  const fmtUsdShort = (n: number | null | undefined) => fmtMoneyShort(n, currency)
  const sc = snap.scenarios
  const noiRange = sc ? `${fmtUsdShort(sc.bad.noi)}–${fmtUsdShort(sc.good.noi)}/год` : null
  const paybackRange =
    sc?.good.payback != null && sc.bad.payback != null
      ? `${fmtYears(sc.good.payback)} – ${fmtYears(sc.bad.payback)}`
      : null
  const zoneShort = snap.zone.applied === 'beachfront' ? 'beachfront'
    : snap.zone.applied === 'walking' ? 'walking-to-beach'
    : snap.zone.applied === 'scooter' ? 'scooter-to-beach'
    : 'inland'
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex items-center gap-3 min-w-0">
        <Sparkles size={20} className="text-[var(--color-primary)] shrink-0" />
        <div className="min-w-0">
          <div className="text-[18px] md:text-[20px] font-semibold text-[#111827] leading-tight">
            {noiRange ? `NOI ${noiRange}` : 'Оценка NOI недоступна'}
            {paybackRange ? ` · окупаемость ${paybackRange}` : ''}
            {' · '}
            <span className="text-[var(--color-text-muted)] font-normal">{zoneShort}</span>
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)] mt-1">
            {snap.villa.title}
          </div>
        </div>
      </div>
      <div className="ml-auto"><ConfidenceBadge confidence={snap.confidence} size={snap.matchSampleSize} /></div>
    </div>
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

function ScenariosIntro({ snap }: { snap: Snapshot }) {
  const competitorCount = snap.competitors.length
  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-search-bg)] px-4 py-3.5 text-[13px] leading-[1.55] text-[var(--color-text)]">
      <div className="font-semibold text-[var(--color-text)] mb-1">Что значат эти три цифры</div>
      <div className="text-[var(--color-text-muted)]">
        Считаем, сколько эта вилла может зарабатывать на посуточной аренде. За основу — {competitorCount > 0 ? <><span className="font-medium text-[var(--color-text)]">{competitorCount}</span> {pluralRu(competitorCount, ['похожая вилла', 'похожие виллы', 'похожих вилл'])}</> : 'похожие виллы'} в той же зоне ({snap.zone.title.toLowerCase()}; на карте сверху — синие точки внутри красного круга).
        {' '}
        <strong className="text-[#B91C1C]">Плохой</strong> — пессимистичный прогноз, вилла стоит полупустой.{' '}
        <strong className="text-[var(--color-primary-pressed)]">Нормальный</strong> — то, что бывает чаще всего.{' '}
        <strong className="text-[#15803D]">Хороший</strong> — потолок, если работать с управляющей компанией и держать высокий рейтинг.
        {' '}
        Под сценариями есть карточки тех самых конкурентов — можно открыть и сравнить площадь / рейтинг / цену с этой виллой.
      </div>
    </div>
  )
}

function Scenarios({ snap }: { snap: Snapshot }) {
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const sc = snap.scenarios!
  const cards: { key: 'bad' | 'median' | 'good'; title: string; tone: string }[] = [
    { key: 'bad', title: 'Плохой', tone: 'border-[#FECACA] bg-[#FEF2F2]' },
    { key: 'median', title: 'Нормальный', tone: 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' },
    { key: 'good', title: 'Хороший', tone: 'border-[#BBF7D0] bg-[#F0FDF4]' },
  ]
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map(c => {
        const e = sc[c.key]
        const isOpen = open === c.key
        return (
          <div key={c.key} className={`rounded-2xl border-2 ${c.tone} p-5`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[12px] uppercase tracking-wide font-semibold text-[#111827]">{c.title}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">ADR {fmtUsd(e.adr)} · {Math.round(e.occupancy * 100)}%</div>
            </div>
            <div className="text-[24px] font-semibold text-[#111827] leading-tight">{fmtUsd(e.noi)}<span className="text-[13px] font-normal text-[var(--color-text-muted)]"> / год NOI</span></div>
            <div className="text-[13px] text-[var(--color-text-muted)] mt-2 space-y-0.5">
              <div>Окупаемость: <span className="text-[#111827] font-medium">{fmtYears(e.payback)}</span></div>
              <div>Cap rate: <span className="text-[#111827] font-medium">{fmtPct(e.capRate)}</span></div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : c.key)}
              className="mt-3 inline-flex items-center gap-1 text-[12px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] cursor-pointer"
            >
              Как считалось {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {isOpen && (
              <ul className="mt-2 text-[12px] text-[var(--color-text)] space-y-0.5 border-t border-[var(--color-border)] pt-2">
                <li>Revenue: {fmtUsd(e.revenue)}</li>
                <li>− Platform ({Math.round(snap.region.platformFeePct * 100)}%): {fmtUsd(e.platformFee)}</li>
                <li>− Mgmt ({Math.round(snap.region.mgmtFeePct * 100)}%): {fmtUsd(e.mgmtFee)}</li>
                <li>− OPEX ({snap.region.opexPerSqmMonth} $/м²/мес): {fmtUsd(e.opex)}</li>
                <li>− Tax ({Math.round(snap.region.taxRate * 100)}%): {fmtUsd(e.tax)}</li>
                <li className="pt-1 border-t border-[var(--color-border)] mt-1 font-medium">= NOI: {fmtUsd(e.noi)}</li>
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

function References({ snap }: { snap: Snapshot }) {
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-5">
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide font-semibold text-[#111827] mb-2">
        <Info size={14} /> Малая выборка — показываем референсы
      </div>
      <div className="text-[13px] text-[var(--color-text-muted)] mb-4">
        В радиусе 2км нашлось всего {snap.matchSampleSize} {pluralRu(snap.matchSampleSize, ['объект', 'объекта', 'объектов'])}, подходящих под характеристики виллы. Агрегаты не считаем — даём конкретные примеры.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(snap.references ?? []).map(r => (
          <a key={r.id} href={r.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="rounded-xl border border-[var(--color-border)] p-3 hover:border-[var(--color-primary)] no-underline text-[#111827]">
            <div className="text-[14px] font-semibold leading-snug line-clamp-2">{r.complex || r.name}</div>
            <div className="text-[12px] text-[var(--color-text-muted)] mt-1">
              {r.bedrooms ?? '?'} BR{r.area ? ` · ${r.area} м²` : ''} · {fmtDistance(r.distanceKm)}
            </div>
            <div className="text-[15px] font-semibold text-[#1D4ED8] mt-2">{fmtUsd(r.adr)}<span className="text-[11px] text-[var(--color-text-muted)] font-normal"> / ночь</span></div>
          </a>
        ))}
      </div>
    </div>
  )
}

function Explanation({ snap }: { snap: Snapshot }) {
  const beachName = snap.zone.nearestBeach?.name ?? 'ближайшего пляжа'
  const meters = snap.zone.walkingMeters
  const beds = snap.villa.bedrooms != null ? `${snap.villa.bedrooms} BR` : 'аналоги'
  const im = snap.infra.metrics
  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-search-bg)] p-5 text-[14px] leading-relaxed text-[var(--color-text)]">
      <span className="font-medium text-[#111827]">Почему такие цифры. </span>
      Зона: {meters != null ? `${fmtMeters(meters)} до ${beachName}` : 'данных по пляжу нет'}, {snap.zone.title.toLowerCase()}.{' '}
      Конкурентов в выборке: {snap.matchSampleSize} {pluralRu(snap.matchSampleSize, ['вилла', 'виллы', 'вилл'])} {beds}{snap.villa.area ? ` ~${snap.villa.area} м²` : ''}.{' '}
      Инфраструктура в радиусе 800 м: {im.beachClubs} beach club, {im.premiumRestaurants} {pluralRu(im.premiumRestaurants, ['ресторан', 'ресторана', 'ресторанов'])} $$$+, {im.fitness} fitness/yoga.
    </div>
  )
}

function CompetitorsGrid({ snap }: { snap: Snapshot }) {
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const [showAll, setShowAll] = useState(false)
  const list = showAll ? snap.competitors : snap.competitors.slice(0, 9)
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[18px] md:text-[20px] font-semibold text-[#111827]">Похожие объекты на Booking · {snap.competitors.length}</h3>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(c => (
          <li key={c.id}>
            <a href={c.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="block rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden no-underline text-[#111827] hover:border-[var(--color-primary)]">
              {c.photo ? (
                <img src={c.photo} alt={c.name} className="w-full h-[140px] object-cover" />
              ) : (
                <div className="w-full h-[140px] bg-[var(--color-search-bg)] flex items-center justify-center text-3xl">🏨</div>
              )}
              <div className="p-3">
                <div className="text-[14px] font-semibold leading-snug line-clamp-2 mb-1">{c.complex || c.name}</div>
                <div className="text-[12px] text-[var(--color-text-muted)] mb-2 flex items-center gap-2">
                  {c.bedrooms != null && <span>{c.bedrooms} BR</span>}
                  {c.area != null && <span>· {c.area} м²</span>}
                  <span>· {fmtDistance(c.distanceKm)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold text-[#1D4ED8]">{fmtUsd(c.adr)}<span className="text-[11px] font-normal text-[var(--color-text-muted)]"> / ночь</span></div>
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
          {showAll ? 'Свернуть' : `Показать все ${snap.competitors.length}`}
        </button>
      )}
    </section>
  )
}

function EmergingBlock({ snap }: { snap: Snapshot }) {
  return (
    <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide font-semibold text-[#111827] mb-2">
        <TrendingUp size={14} className="text-[var(--color-primary)]" /> Новый район
      </div>
      <div className="text-[14px] text-[var(--color-text)] leading-relaxed">
        Район в фазе раннего развития: в радиусе 1км менее 30 листингов на Booking. По траектории сопоставимых рынков
        (Berawa 2018→2022, Canggu 2014→2018) ADR может вырасти на 30–80% за 4–5 лет. Это историческая аналогия, не прогноз.
      </div>
      <div className="text-[12px] text-[var(--color-text-muted)] mt-3">
        Локально в радиусе 1км: {snap.totalCompetitorsInRadius} {pluralRu(snap.totalCompetitorsInRadius, ['объект', 'объекта', 'объектов'])} в общей сложности
      </div>
    </section>
  )
}

const CAT_META: Record<string, { title: string; icon: string; limit: number }> = {
  beach: { title: 'Пляжи', icon: '🏝️', limit: 5 },
  beachclub: { title: 'Beach clubs', icon: '🏖️', limit: 5 },
  restaurant: { title: 'Рестораны', icon: '🍽️', limit: 6 },
  cafe: { title: 'Кафе', icon: '☕️', limit: 6 },
  wellness: { title: 'Йога и фитнес', icon: '🧘', limit: 5 },
  nightlife: { title: 'Бары и клубы', icon: '🍸', limit: 5 },
  attraction: { title: 'Достопримечательности', icon: '✨', limit: 5 },
  international_school: { title: 'Международные школы', icon: '🎓', limit: 5 },
  school: { title: 'Школы', icon: '🏫', limit: 5 },
  preschool: { title: 'Сады и ясли', icon: '🧸', limit: 5 },
  supermarket: { title: 'Магазины', icon: '🛒', limit: 5 },
  pharmacy: { title: 'Аптеки', icon: '💊', limit: 5 },
  hospital: { title: 'Клиники', icon: '🏥', limit: 5 },
}

function NearbyPlacesBlock({ snap }: { snap: Snapshot }) {
  // Cross-category dedup: place shown in more specific category wins.
  // Order = specificity priority. Same place won't appear twice.
  const ORDER = [
    'beach', 'beachclub',
    'international_school', 'school', 'preschool',
    'wellness',
    'restaurant', 'cafe',
    'supermarket', 'pharmacy', 'hospital',
    'nightlife', 'attraction',
  ]
  // Quality filters per category. Excludes "warung" (cheap local eateries).
  const isWarung = (name: string | null) => /\bwarung\b/i.test(name ?? '')
  // 2 пути прохождения: «крепкое качество» (высокий rating + базовый минимум отзывов)
  // ИЛИ «культовое место» (rating чуть ниже, но тысячи отзывов — Zest, Alchemy и т.п.).
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
    // mb-10 matches the rest of the detail-page sections so the rhythm
    // stays even no matter whether the investment block above it is
    // visible (Все / Инвестиции) or hidden (Для жизни).
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-[18px] md:text-[20px] font-semibold text-[#111827]">Что вокруг виллы</h3>
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
                      <span>{fmtDistance(p.distanceKm)}</span>
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

