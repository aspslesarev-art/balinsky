'use client'

// Строка глав страницы виллы: прилипает под шапкой, подсвечивает главу,
// которая сейчас на экране, по нажатию прокручивает к ней.
import { useEffect, useRef, useState } from 'react'

export function VillaChapterNav({ items, label = 'Разделы страницы' }: { items: { id: string; no: string; label: string }[]; label?: string }) {
  const [active, setActive] = useState(items[0]?.id ?? '')
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const els = items.map(i => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e)
    if (!els.length) return
    const io = new IntersectionObserver(entries => {
      const seen = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (seen[0]) setActive(seen[0].target.id)
    }, { rootMargin: '-140px 0px -55% 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [items])

  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>(`[data-id="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  return (
    <nav ref={navRef} aria-label={label}
      className="sticky top-[72px] [html[data-header-hidden='1']_&]:top-0 md:[html[data-header-hidden='1']_&]:top-[72px] transition-[top] duration-300 z-10 -mx-6 px-6 w-[calc(100%+48px)] max-w-none md:w-auto md:max-w-full md:mx-0 md:px-0 py-3 bg-white/95 backdrop-blur border-b border-[#E4E9E6] flex gap-2 overflow-x-auto [scrollbar-width:none]">
      {items.map(i => {
        const on = i.id === active
        return (
          <a key={i.id} data-id={i.id} href={`#${i.id}`}
            onClick={e => { e.preventDefault(); document.getElementById(i.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActive(i.id) }}
            className={`shrink-0 h-10 px-4 rounded-full inline-flex items-center gap-2 text-[14px] font-semibold no-underline transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${on ? 'bg-[#18201C] text-white' : 'bg-[#F3F7F4] text-[var(--color-text)] hover:bg-[#E7EEEA]'}`}>
            <span className="text-[12px] opacity-60 tabular-nums">{i.no}</span>{i.label}
          </a>
        )
      })}
    </nav>
  )
}
