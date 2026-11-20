'use client'

import { useState, type ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

// «Ещё фильтры» (владелец 20.11.2026, макет CatA/CatB): главные фильтры видны
// всегда, остальные раскрываются по кнопке — без двух рядов кнопок над списком.
// Если среди спрятанных есть выбранный — раскрыто сразу.
const COPY = {
  ru: 'Ещё фильтры', en: 'More filters', id: 'Filter lainnya', fr: 'Plus de filtres', de: 'Weitere Filter',
  zh: '更多筛选', nl: 'Meer filters', ban: 'Filter tiosan', pl: 'Więcej filtrów', uk: 'Ще фільтри',
} as const

export function MoreFilters({ lang, active, count, children }: { lang: Lang; active: number; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(active > 0)
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}
        className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-[14px] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${open || active > 0 ? 'border-[#0F1A15] bg-[#0F1A15] text-white' : 'border-[#D9DFDC] bg-white text-[#0F1A15] hover:border-[#0F1A15]'}`}>
        <SlidersHorizontal size={16} aria-hidden /> {pickCopy(COPY, lang)} · {active > 0 ? active : count}
      </button>
      {open && children}
    </>
  )
}
