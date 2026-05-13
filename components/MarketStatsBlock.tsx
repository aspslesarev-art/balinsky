// "Рынок краткосрочной аренды в радиусе 500 м" — compact comparables block
// fed from estatemarket.io. Renders nothing when both villa_count and
// apartment_count are 0 (no listings nearby → no signal to show).

import { TrendingUp, Hotel, Home as HomeIcon, ExternalLink, Info } from 'lucide-react'
import type { ComplexMarketStats } from '@/lib/complex-market-stats'

const COPY = {
  ru: {
    title: 'Рынок краткосрочной аренды поблизости',
    subtitle: 'Booking-данные с estatemarket.io в радиусе 1 км',
    villas: 'Виллы',
    apartments: 'Апартаменты',
    listings: 'листингов',
    occupancy: 'Загрузка',
    adr: 'ADR (ср. ночь)',
    revpar: 'RevPAR',
    revparHint: 'RevPAR = Загрузка × ADR. Метрика дохода с номера за ночь.',
    sourceTitle: 'Источник',
    estateMarket: 'estatemarket.io',
    none: 'нет данных в радиусе',
    fewData: 'мало данных',
    total: (n: number) => `${n} ${n === 1 ? 'листинг' : n < 5 ? 'листинга' : 'листингов'} в радиусе 1 км`,
  },
  en: {
    title: 'Short-term rental market nearby',
    subtitle: 'Booking data from estatemarket.io within 1 km',
    villas: 'Villas',
    apartments: 'Apartments',
    listings: 'listings',
    occupancy: 'Occupancy',
    adr: 'ADR (avg/night)',
    revpar: 'RevPAR',
    revparHint: 'RevPAR = Occupancy × ADR. Per-room revenue per night.',
    sourceTitle: 'Source',
    estateMarket: 'estatemarket.io',
    none: 'no listings in radius',
    fewData: 'too few',
    total: (n: number) => `${n} listing${n === 1 ? '' : 's'} within 1 km`,
  },
} as const

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

        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2 text-[11.5px] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Info size={11} />
            {c.revparHint}
          </span>
          <a
            href="https://estatemarket.io/booking_data-map"
            target="_blank"
            rel="noopener noreferrer"
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

// Widen literal-string fields so EN values fit the same shape.
type Copy = { [K in keyof (typeof COPY)['ru']]: (typeof COPY)['ru'][K] extends (...args: infer A) => infer R ? (...args: A) => R : string }

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
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-search-bg)] p-3.5">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[#111827] mb-2.5">
        <Icon size={14} className="text-[var(--color-primary)]" />
        {label}
        <span className="ml-auto text-[12px] font-normal text-[var(--color-text-muted)]">
          {count} {c.listings}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">{c.occupancy}</div>
          <div className="text-[15px] font-semibold text-[#111827] mt-0.5">{fmtPct(occ)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">{c.adr}</div>
          <div className="text-[15px] font-semibold text-[#111827] mt-0.5">{adr != null ? fmtUsd(adr) : c.fewData}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">{c.revpar}</div>
          <div className="text-[15px] font-semibold text-[var(--color-primary)] mt-0.5">{revpar != null ? fmtUsd(revpar) : '—'}</div>
        </div>
      </div>
    </div>
  )
}
