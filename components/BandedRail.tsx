'use client'

// Лента соседей с тремя зонами «плохо / средне / хорошо» сверху (владелец
// 23.10.2026): нажали зону — лента прокручивается к первой карточке этой
// зоны. Лента идёт от дорогих к дешёвым, так что «хорошо» в начале.
import { useRef, useState, type ReactNode } from 'react'
import { CardRail } from './CardRail'

export type Band = 'bad' | 'mid' | 'good'

/** Полупрозрачные фон и рамка зоны — у плашки и у карточки соседа. */
export const BAND_SURFACE: Record<Band, string> = {
  bad: 'border-[rgb(209_67_52/.35)] bg-[rgb(209_67_52/.08)]',
  mid: 'border-[rgb(232_160_40/.45)] bg-[rgb(232_160_40/.12)]',
  good: 'border-[rgb(31_139_95/.40)] bg-[rgb(31_139_95/.08)]',
}
export const BAND_TEXT: Record<Band, string> = {
  bad: 'text-[#8A1F14]',
  mid: 'text-[#7A4B0B]',
  good: 'text-[var(--color-primary-pressed)]',
}

export function BandedRail({ heading, chips, items, prevLabel, nextLabel }: {
  heading: string
  chips: { band: Band; title: string; range: ReactNode; money: ReactNode }[]
  items: { band: Band; node: ReactNode }[]
  prevLabel: string
  nextLabel: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<Band | null>(null)

  const jump = (band: Band) => {
    setActive(band)
    const card = root.current?.querySelector(`[data-band="${band}"]`)
    const li = card?.closest('li')
    const ul = li?.parentElement
    if (!li || !ul) return
    const left = li.getBoundingClientRect().left - ul.getBoundingClientRect().left + ul.scrollLeft
    ul.scrollTo({ left, behavior: 'smooth' })
  }

  const has = new Set(items.map(x => x.band))
  return (
    <div ref={root} className="flex flex-col gap-4">
      <h3 className="text-[18px] font-semibold tracking-tight">{heading}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {chips.map(ch => (
          <button key={ch.band} type="button" onClick={() => jump(ch.band)} disabled={!has.has(ch.band)} aria-pressed={active === ch.band}
            className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-shadow duration-[120ms] hover:shadow-[0_1px_2px_rgb(0_0_0/.04),0_4px_12px_rgb(0_0_0/.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-default disabled:opacity-60 disabled:hover:shadow-none ${BAND_SURFACE[ch.band]} ${BAND_TEXT[ch.band]} ${active === ch.band ? 'ring-2 ring-current' : ''}`}>
            <span className="text-[14px] font-semibold">{ch.title}</span>
            <span className="text-[20px] font-semibold leading-tight text-[var(--color-text)]">{ch.range}</span>
            <span className="text-[13px]">{ch.money}</span>
          </button>
        ))}
      </div>
      <CardRail prevLabel={prevLabel} nextLabel={nextLabel}>
        {items.map((x, i) => <div key={i} data-band={x.band} className="h-full">{x.node}</div>)}
      </CardRail>
    </div>
  )
}
