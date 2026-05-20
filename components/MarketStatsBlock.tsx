// "Рынок краткосрочной аренды поблизости" — compact comparables block
// fed from estatemarket.io. Always renders the segment cards directly
// (no collapse) — the segment data is what makes the block worth
// showing in the first place. Renders nothing when both villa_count
// and apartment_count are 0.

import { TrendingUp, Hotel, Home as HomeIcon, ExternalLink } from 'lucide-react'
import type { ComplexMarketStats } from '@/lib/complex-market-stats'

const COPY = {
  ru: {
    title: 'Сколько зарабатывают соседи',
    subtitle: 'По данным estatemarket.io — все объекты на Booking в радиусе 1 км',
    villas: 'Виллы',
    apartments: 'Апартаменты',
    listings: 'на Booking',
    occupancy: 'Заполняемость',
    occupancyHint: 'Сколько процентов ночей в году объект реально сдан.',
    adr: 'Средняя цена за ночь',
    adrHint: 'Сколько в среднем платит гость за ночь (ADR — Average Daily Rate).',
    revpar: 'Доход с номера за ночь',
    revparHint: 'Средний заработок объекта с одной календарной ночи (RevPAR = заполняемость × цена).',
    annual: 'Прогноз дохода в год',
    annualHint: 'Доход с ночи × 365. Сколько примерно вилла этого района приносит за полный год при текущей заполняемости.',
    daysBooked: 'нед. забронированных в год',
    sourceTitle: 'Источник',
    estateMarket: 'estatemarket.io',
    none: 'нет данных в радиусе',
    fewData: 'мало данных',
    total: (n: number) => `${n} ${n === 1 ? 'объект' : n < 5 ? 'объекта' : 'объектов'} в радиусе 1 км`,
  },
  en: {
    title: 'What neighbours earn',
    subtitle: 'From estatemarket.io — every Booking listing within 1 km',
    villas: 'Villas',
    apartments: 'Apartments',
    listings: 'on Booking',
    occupancy: 'Occupancy',
    occupancyHint: 'Share of nights per year the property is actually rented.',
    adr: 'Average price per night',
    adrHint: 'What a guest typically pays for one night (ADR — Average Daily Rate).',
    revpar: 'Revenue per available night',
    revparHint: 'Average earnings per calendar night (RevPAR = occupancy × ADR).',
    annual: 'Estimated annual revenue',
    annualHint: 'RevPAR × 365. Roughly what a villa of this segment earns over a full year at the current occupancy and rate.',
    daysBooked: 'nights booked per year',
    sourceTitle: 'Source',
    estateMarket: 'estatemarket.io',
    none: 'no listings in radius',
    fewData: 'too few',
    total: (n: number) => `${n} listing${n === 1 ? '' : 's'} within 1 km`,
  },
} as const

type Copy = { [K in keyof (typeof COPY)['ru']]: (typeof COPY)['ru'][K] extends (...args: infer A) => infer R ? (...args: A) => R : string }

function fmtPct(v: number | null): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}
function fmtUsd(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1000) return `$${Math.round(v).toLocaleString('en-US')}`
  return `$${Math.round(v)}`
}

export function MarketStatsBlock({ data, lang = 'ru' }: { data: ComplexMarketStats; lang?: 'ru' | 'en' }) {
  const c = COPY[lang]
  if (data.villa_count === 0 && data.apartment_count === 0) return null

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <TrendingUp size={18} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
              {c.title}
            </div>
            <div className="text-[13px] text-[var(--color-text-muted)] leading-snug">
              {c.subtitle} · {c.total(data.total_listings_500m)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.villa_count > 0 && (
            <SegmentCard
              icon={HomeIcon}
              label={c.villas}
              count={data.villa_count}
              occ={data.villa_occupancy_pct}
              adr={data.villa_adr_usd}
              revpar={data.villa_revpar_usd}
              c={c}
            />
          )}
          {data.apartment_count > 0 && (
            <SegmentCard
              icon={Hotel}
              label={c.apartments}
              count={data.apartment_count}
              occ={data.apartment_occupancy_pct}
              adr={data.apartment_adr_usd}
              revpar={data.apartment_revpar_usd}
              c={c}
            />
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-end gap-2 text-[11.5px] text-[var(--color-text-muted)]">
          <a
            href="https://estatemarket.io/booking_data-map"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[var(--color-primary)] no-underline"
          >
            {c.sourceTitle}: {c.estateMarket}
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </section>
  )
}

function SegmentCard({
  icon: Icon, label, count, occ, adr, revpar, c,
}: {
  icon: typeof HomeIcon
  label: string
  count: number
  occ: number | null
  adr: number | null
  revpar: number | null
  c: Copy
}) {
  // Derived: annual gross revenue per unit at current occupancy + ADR.
  // The single most actionable number for an investor evaluating a buy
  // (alongside the unit price they'll see elsewhere on the page).
  const annual = revpar != null ? revpar * 365 : null
  const daysBooked = occ != null ? Math.round((occ / 100) * 365) : null
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-[#111827] mb-3 pb-2 border-b border-[var(--color-border)]">
        <Icon size={15} className="text-[var(--color-primary)]" />
        {label}
        <span className="ml-auto text-[12px] font-normal text-[var(--color-text-muted)]">
          {count} {c.listings}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric label={c.occupancy} value={fmtPct(occ)} hint={c.occupancyHint} sub={daysBooked != null ? `≈ ${daysBooked} ${c.daysBooked}` : null} />
        <Metric label={c.adr}       value={adr != null ? fmtUsd(adr) : c.fewData} hint={c.adrHint} />
        <Metric label={c.revpar}    value={revpar != null ? fmtUsd(revpar) : '—'} tone="primary" hint={c.revparHint} />
        <Metric label={c.annual}    value={annual != null ? fmtUsd(annual) : '—'} tone="primary" hint={c.annualHint} />
      </div>
    </div>
  )
}

function Metric({ label, value, tone = 'default', hint, sub }: {
  label: string; value: string; tone?: 'default' | 'primary'; hint?: string | null; sub?: string | null
}) {
  return (
    <div title={hint ?? undefined}>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] leading-tight">{label}</div>
      <div className={`text-[17px] font-semibold mt-0.5 leading-none ${tone === 'primary' ? 'text-[var(--color-primary)]' : 'text-[#111827]'}`}>
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-[var(--color-text-muted)] mt-1">{sub}</div>}
    </div>
  )
}
