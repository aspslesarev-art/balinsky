// «Стоимость земли» — лизхолд-оценка земли под виллой.
// Лизхолд-данные напрямую, или фрихолд × 0.35 как запасной вариант.
// Одна строка без рамки и заголовка: цифра + короткая подпись, как посчитано.

import { pickCopy, type Lang } from '@/lib/i18n'
import { InlinePrice } from './InlinePrice'
import type { LandPriceBundle } from '@/lib/land-prices'

const COPY = {
  ru: {
    landValue: 'примерная стоимость аренды земли под виллой',
    m2: 'м²',
    median: (n: number) => ` - медиана по ${n} участкам рядом`,
    adjusted: ' (фрихолд × 0,35)',
  },
  en: {
    landValue: 'approximate cost of the land lease under the villa',
    m2: 'm²',
    median: (n: number) => ` - median of ${n} plots nearby`,
    adjusted: ' (freehold × 0.35)',
  },
}

export function LandPriceBlock({ data, landM2, lang }: {
  data: LandPriceBundle
  landM2: number
  priceUsd?: number
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const landValue = data.medianPpm * landM2

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[24px] font-semibold tracking-tight text-[var(--color-text)]">
          <InlinePrice usd={Math.round(landValue)} lang={lang} approx />
        </span>
        <span className="text-[15px] text-[var(--color-text-muted)]">{c.landValue}</span>
      </div>
      <p className="text-[13px] text-[var(--color-text-muted)]">
        {landM2} {c.m2} × <InlinePrice usd={data.medianPpm} lang={lang} approx={false} />/{c.m2}
        {c.median(data.n)}
        {data.method !== 'leasehold' && c.adjusted}
      </p>
    </div>
  )
}
