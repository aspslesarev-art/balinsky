'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Clamps long prose to a short lead with a "Подробнее" toggle that reveals the
// full text. SEO-safe: the complete text is always present in the DOM (it's
// only visually clipped via max-height/overflow), so crawlers index everything.
//
// We start collapsed (overflows=true) so a long description doesn't flash open
// then snap shut on hydration. After mount we measure the real height: if the
// content actually fits within `collapsedHeight`, the clamp and the button are
// dropped so short descriptions render normally.
export function ExpandableText({
  children,
  collapsedHeight = 150,
  more = 'Подробнее',
  less = 'Свернуть',
  className,
}: {
  children: React.ReactNode
  collapsedHeight?: number
  more?: string
  less?: string
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > collapsedHeight + 24)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [collapsedHeight, children])

  const clamped = overflows && !expanded

  return (
    <div className={className}>
      <div
        ref={ref}
        style={clamped ? { maxHeight: collapsedHeight } : undefined}
        className="relative overflow-hidden"
      >
        {children}
        {clamped && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          className="mt-2.5 inline-flex items-center gap-1 text-[14px] font-medium text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] cursor-pointer"
        >
          {expanded ? less : more}
          <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  )
}
