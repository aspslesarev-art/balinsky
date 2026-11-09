// «Земля в этом районе» — медианная цена за м² рядом с виллой.

import { pickCopy, type Lang } from '@/lib/i18n'
import { InlinePrice } from './InlinePrice'
import type { LandPriceBundle } from '@/lib/land-prices'

const COPY = {
  ru: {
    title: 'Земля в этом районе',
    median: 'за м²',
    range: (p25: number, p75: number) => `от $${fmt(p25)} до $${fmt(p75)} за м²`,
    note: (n: number, r: number) => `По ${n} участкам в радиусе ${r} км (фрихолд). Цены из объявлений.`,
    landShare: (pct: number) => `≈ ${pct}% цены виллы - стоимость земли`,
  },
  en: {
    title: 'Land in this area',
    median: 'per m²',
    range: (p25: number, p75: number) => `from $${fmt(p25)} to $${fmt(p75)} per m²`,
    note: (n: number, r: number) => `Based on ${n} plots within ${r} km (freehold). Asking prices.`,
    landShare: (pct: number) => `≈ ${pct}% of villa price is land value`,
  },
}

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

export function LandPriceBlock({ data, landM2, priceUsd, lang }: {
  data: LandPriceBundle
  landM2: number | null
  priceUsd: number | null
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const landValue = landM2 ? data.medianPpm * landM2 : null
  const landPct = landValue && priceUsd && priceUsd > 0 ? Math.round(landValue / priceUsd * 100) : null

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-[var(--color-text-muted)]" aria-hidden="true">
          <path d="M3 17h14M4 13l3-4 3 2 3-5 3 4v7H4v-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[15px] font-semibold text-[var(--color-text)]">{c.title}</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold tracking-tight text-[var(--color-text)]">
          <InlinePrice usd={data.medianPpm} lang={lang} approx={false} />
        </span>
        <span className="text-[15px] text-[var(--color-text-muted)]">{c.median}</span>
      </div>

      <div className="text-[14px] text-[var(--color-text-muted)]">
        {c.range(data.p25, data.p75)}
      </div>

      {landPct != null && landPct > 0 && landPct < 100 && (
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-[var(--color-search-bg)] overflow-hidden">
            <div className="h-full rounded-full bg-[#B8860B]" style={{ width: `${Math.min(landPct, 100)}%` }} />
          </div>
          <span className="whitespace-nowrap text-[13px] font-medium text-[#B8860B]">{c.landShare(landPct)}</span>
        </div>
      )}

      <p className="text-[12px] leading-relaxed text-[var(--color-text-muted)]">
        {c.note(data.n, data.radiusKm)}
      </p>
    </div>
  )
}
