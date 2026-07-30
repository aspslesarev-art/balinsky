'use client'

import { useEffect, useRef, useState } from 'react'

/** Frame duration of the hover slide-show, per the handoff (4200 ms). */
const FRAME_MS = 4200
const MOVES = 5

type Props = {
  href: string
  kicker: string
  name: string
  meta: string
  progressPct: number | null
  photos: string[]
  note?: string | null
}

/**
 * Project card with a hover slide-show: cross-fade + Ken Burns over the
 * complex photos. Leaving the card pauses on the current frame instead of
 * restarting, which is what the handoff asks for.
 */
export function ProjectCard({ href, kicker, name, meta, progressPct, photos, note }: Props) {
  const [frame, setFrame] = useState(0)
  const [hover, setHover] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!hover || photos.length < 2) return
    timer.current = setInterval(() => setFrame(f => f + 1), FRAME_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [hover, photos.length])

  const shown = photos.length ? photos[frame % photos.length] : null
  const cycleMs = Math.max(photos.length, 1) * FRAME_MS

  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', width: 360, maxWidth: '82vw',
        border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)',
        overflow: 'hidden', color: 'var(--color-text)',
        transition: 'border-color .25s ease',
      }}
    >
      <div style={{ position: 'relative', height: 220, overflow: 'hidden', background: 'var(--color-divider)' }}>
        {shown && (
          <div
            key={shown + String(frame)}
            className="kb-layer"
            data-on="1"
            data-move={String(frame % MOVES)}
            style={{ backgroundImage: `url(${JSON.stringify(shown).slice(1, -1)})` }}
          />
        )}
        {hover && photos.length > 1 && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(0,0,0,.18)' }}>
            <span style={{
              display: 'block', height: '100%', background: 'var(--color-accent)',
              animation: `ue-ticker-run ${cycleMs}ms linear infinite`,
            }} />
          </div>
        )}
      </div>
      <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="kicker">{kicker}</div>
        <div style={{ fontSize: 22, fontWeight: 500 }}>{name}</div>
        <div className="muted" style={{ fontSize: 15 }}>{meta}</div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }} className="muted">
            <span>Готовность строительства</span>
            <span>{progressPct == null ? 'нет данных' : `${progressPct}%`}</span>
          </div>
          <div style={{ marginTop: 6, height: 3, background: 'var(--color-divider)' }}>
            <div style={{ width: `${progressPct ?? 0}%`, height: '100%', background: 'var(--color-accent)' }} />
          </div>
        </div>
        {note && <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{note}</div>}
      </div>
    </a>
  )
}
