'use client'

// Карточка «зоны вокруг» в колонке «Участок» (макет «Зоны вокруг», вариант C,
// владелец 2026-11-11): превью, зона участка, две главные доли вокруг.
// Нажатие открывает карту зон во вкладке окна медиаблока (VillaGallery
// слушает событие bx:open-media).

import Image from 'next/image'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { plot: 'Участок', around: 'Вокруг', open: 'Открыть карту зон →' },
  en: { plot: 'Plot', around: 'Around', open: 'Open the zoning map →' },
} as const

export function ZoningCard({ thumb, plot, around, lang }: {
  thumb: string
  plot: { label: string; color: string | null } | null
  around: string | null
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  return (
    <button type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('bx:open-media', { detail: { tab: 'x:zones' } }))}
      className="mt-4 w-full flex items-center gap-3.5 p-2.5 rounded-xl border border-[#E4E9E6] bg-white text-left cursor-pointer hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] transition-colors duration-[120ms]">
      <span className="relative shrink-0 w-[104px] h-[104px] rounded-lg overflow-hidden bg-[#1A221E]">
        <Image src={thumb} alt="" fill sizes="104px" className="object-cover" unoptimized />
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-1.5">
        {plot && (
          <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
            {plot.color && <span className="w-2.5 h-2.5 rounded-[2px] shrink-0 border border-black/10" style={{ background: plot.color }} />}
            {c.plot}: {plot.label}
          </span>
        )}
        {around && <span className="text-[13px] leading-[1.4] text-[var(--color-text-muted)]">{c.around} {around}</span>}
        <span className="text-[14px] font-semibold text-[var(--color-primary)]">{c.open}</span>
      </span>
    </button>
  )
}
