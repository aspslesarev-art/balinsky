'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'

// Значок «i» рядом с заголовком: длинное пояснение (источник данных, как
// считали) прячется под ним, чтобы не загромождать блок (владелец 22.10.2026).
// Компьютер — при наведении и фокусе, телефон — по нажатию; закрывается
// по Esc и нажатию мимо. Окошко прижимается к краю значка (align), но не
// вылезает за экран: на телефоне значок стоит у левого края, и окошко
// в 340 px иначе уходило вправо.

const W = 340, GAP = 16

export function InfoTip({ children, label, align = 'end' }: {
  children: ReactNode
  /** Подпись для экранного диктора («Откуда данные»). */
  label: string
  /** К какому краю значка прижать окошко: end — вправо (у правого края блока). */
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)
  const [shift, setShift] = useState(0)
  const id = useId()

  // Сдвиг окошка внутрь экрана — до отрисовки, чтобы не мигало.
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const w = Math.min(W, window.innerWidth - GAP * 2)
    const left = align === 'end' ? r.right - w : r.left
    const fixed = Math.min(Math.max(left, GAP), window.innerWidth - GAP - w)
    setShift(fixed - left)
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setPinned(false) }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setPinned(false) } }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <span
      ref={ref}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!pinned) setOpen(false) }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => { setPinned(p => !p); setOpen(o => !(o && pinned)) }}
        onFocus={() => setOpen(true)}
        onBlur={() => { if (!pinned) setOpen(false) }}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors duration-[120ms] hover:bg-[var(--color-search-bg)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]"
      >
        <Info size={16} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          style={{ transform: shift ? `translateX(${shift}px)` : undefined }}
          className={`absolute top-full z-40 mt-2 block w-[min(340px,calc(100vw-32px))] max-w-none rounded-xl border border-[var(--color-border)] bg-white p-3.5 text-left text-[13px] font-normal normal-case leading-relaxed tracking-normal text-[var(--color-text)] shadow-[0_1px_2px_rgb(0_0_0/.04),0_8px_24px_rgb(15_26_21/.12)] ${align === 'end' ? 'right-0' : 'left-0'}`}
        >
          {children}
        </span>
      )}
    </span>
  )
}
