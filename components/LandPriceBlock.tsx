// «Стоимость земли» — лизхолд-оценка земли под виллой.
// Лизхолд-данные напрямую, или фрихолд × 0.35 как запасной вариант.

import { pickCopy, type Lang } from '@/lib/i18n'
import { InlinePrice } from './InlinePrice'
import type { LandPriceBundle } from '@/lib/land-prices'

const COPY = {
  ru: {
    title: 'Стоимость земли (лизхолд)',
    landValue: 'аренда земли под виллой',
    landPpm: 'за м²',
    share: (pct: number) => `${pct}% цены виллы - земля, остальное - стройка`,
    noteLeasehold: (n: number, ppm: number, m2: number) =>
      `Расчёт: ${m2} м² × медиана $${fmt(ppm)}/м² по ${n} лизхолд-участкам рядом.`,
    noteAdjusted: (n: number, ppm: number, m2: number) =>
      `Расчёт: ${m2} м² × медиана $${fmt(ppm)}/м² (фрихолд-цена × 0.35 - типичная пропорция для лизхолда 25-30 лет, ${n} участков рядом).`,
  },
  en: {
    title: 'Land value (leasehold)',
    landValue: 'land lease under the villa',
    landPpm: 'per m²',
    share: (pct: number) => `${pct}% of villa price is land, the rest is construction`,
    noteLeasehold: (n: number, ppm: number, m2: number) =>
      `Based on ${m2} m² × median $${fmt(ppm)}/m² from ${n} leasehold plots nearby.`,
    noteAdjusted: (n: number, ppm: number, m2: number) =>
      `Based on ${m2} m² × median $${fmt(ppm)}/m² (freehold price × 0.35 - typical ratio for 25-30 year leasehold, ${n} plots nearby).`,
  },
}

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

export function LandPriceBlock({ data, landM2, priceUsd, lang }: {
  data: LandPriceBundle
  landM2: number
  priceUsd: number
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const landValue = data.medianPpm * landM2
  const landPct = priceUsd > 0 ? Math.round(landValue / priceUsd * 100) : null
  const buildValue = landPct != null && landPct < 100 ? priceUsd - landValue : null

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
          <InlinePrice usd={Math.round(landValue)} lang={lang} approx />
        </span>
        <span className="text-[15px] text-[var(--color-text-muted)]">{c.landValue}</span>
      </div>

      {landPct != null && landPct > 0 && landPct < 200 && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-3 flex-1 rounded-full bg-[var(--color-search-bg)] overflow-hidden flex">
              <div className="h-full rounded-l-full bg-[#B8860B]" style={{ width: `${Math.min(landPct, 100)}%` }} />
              {buildValue != null && buildValue > 0 && (
                <div className="h-full rounded-r-full bg-[var(--color-primary)]" style={{ width: `${Math.max(100 - landPct, 0)}%` }} />
              )}
            </div>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="font-medium text-[#B8860B]">
              🟫 {c.landPpm}: <InlinePrice usd={data.medianPpm} lang={lang} approx={false} />
            </span>
            {buildValue != null && buildValue > 0 && (
              <span className="font-medium text-[var(--color-primary)]">
                🟩 <InlinePrice usd={Math.round(buildValue)} lang={lang} approx />
              </span>
            )}
          </div>
          <p className="text-[14px] font-medium text-[var(--color-text)]">
            {c.share(landPct)}
          </p>
        </>
      )}

      <p className="text-[12px] leading-relaxed text-[var(--color-text-muted)]">
        {data.method === 'leasehold'
          ? c.noteLeasehold(data.n, data.medianPpm, landM2)
          : c.noteAdjusted(data.n, data.medianPpm, landM2)}
      </p>
    </div>
  )
}
