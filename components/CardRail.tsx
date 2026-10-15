'use client'

// Лента карточек: по три в ряд на компьютере, остальные листаются стрелками
// или пальцем. Фото в карточках грузятся лениво — браузер тянет их, только
// когда карточка подъезжает к экрану.
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CardRail({ children, prevLabel, nextLabel }: { children: ReactNode; prevLabel: string; nextLabel: string }) {
  const ref = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update])

  const go = (dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    const card = el.querySelector('li')
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const items = Children.toArray(children)
  const btn = 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text)] transition-colors duration-[120ms] hover:border-[var(--color-primary)] disabled:opacity-40 disabled:hover:border-[var(--color-border)] cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'

  return (
    <div>
      <ul
        ref={ref}
        onScroll={update}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto"
      >
        {items.map((child, i) => (
          <li key={i} className="shrink-0 snap-start basis-[85%] sm:basis-[calc((100%-16px)/2)] lg:basis-[calc((100%-32px)/3)]">
            {child}
          </li>
        ))}
      </ul>
      {!(edge.start && edge.end) && (
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btn} onClick={() => go(-1)} disabled={edge.start} aria-label={prevLabel}>
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button type="button" className={btn} onClick={() => go(1)} disabled={edge.end} aria-label={nextLabel}>
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
