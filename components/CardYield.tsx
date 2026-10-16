import { TrendingUp } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// «≈8,2% в год до налогов» на карточке каталога. Цифра — та же, что первой
// стоит на странице объекта (доходность до налогов при посуточной сдаче,
// listing_yields через lib/investment/batch-scores.ts), и формат тот же:
// один знак после запятой (components/ListingVerdict.tsx). Нет цифры (не
// посчитана или жёлтая земля, где посуточно сдавать нельзя) — ничего не
// рисуем, а не «0%».
const LABEL: Record<Lang, (p: string) => string> = {
  ru: p => `≈${p}% в год до налогов`,
  en: p => `≈${p}% a year before tax`,
  id: p => `≈${p}% per tahun sebelum pajak`,
  fr: p => `≈${p} % par an avant impôts`,
  de: p => `≈${p} % pro Jahr vor Steuern`,
  zh: p => `税前年收益 ≈${p}%`,
  nl: p => `≈${p}% per jaar vóór belasting`,
  ban: p => `≈${p}% awarsa sadurung pajeg`,
  pl: p => `≈${p}% rocznie przed opodatkowaniem`,
  uk: p => `≈${p}% на рік до податків`,
}

const DOT_DECIMAL = new Set<Lang>(['en', 'zh'])

export function CardYield({ pct, lang = 'ru', className = '' }: { pct: number | null | undefined; lang?: Lang; className?: string }) {
  if (pct == null || !Number.isFinite(pct) || pct <= 0) return null
  const num = pct.toFixed(1)
  const p = DOT_DECIMAL.has(lang) ? num : num.replace('.', ',')
  return (
    <div className={`flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-primary)] ${className}`}>
      <TrendingUp size={14} strokeWidth={2} aria-hidden className="shrink-0" />
      <span>{(LABEL[lang] ?? LABEL.en)(p)}</span>
    </div>
  )
}
