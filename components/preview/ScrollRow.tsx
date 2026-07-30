'use client'

import { useRef, type ReactNode } from 'react'

/** Horizontal snap row with ← / → arrows, per the handoff: one click scrolls 80% of the width. */
export function ScrollRow({ title, count, children }: { title: string; count?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const nudge = (dir: -1 | 1) => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }
  const arrow = {
    border: '1px solid var(--color-divider)',
    background: 'transparent',
  } as const
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <h2 className="uehead">{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {count && <span className="muted" style={{ fontSize: 15 }}>{count}</span>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="arrow" style={arrow} onClick={() => nudge(-1)} aria-label="Назад">←</button>
            <button type="button" className="arrow" style={arrow} onClick={() => nudge(1)} aria-label="Вперёд">→</button>
          </div>
        </div>
      </div>
      <div ref={ref} className="scroll-row">{children}</div>
    </>
  )
}
