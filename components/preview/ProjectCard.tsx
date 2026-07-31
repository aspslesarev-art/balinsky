'use client'

import { useEffect, useRef, useState } from 'react'

/** Frame duration of the hover slide-show, per the handoff. */
const FRAME_MS = 4200
/** Number of Ken Burns movements defined in preview.css. */
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
 * Project card from the handoff: on hover the complex photos cross-fade with a
 * Ken Burns move, a solid ticker runs across the image for the whole cycle,
 * and the footer reveals the link through to the complex.
 *
 * Every photo is mounted as its own layer — a single swapped layer cannot
 * cross-fade, it can only cut. Leaving the card pauses the cycle on the
 * current frame instead of rewinding it, which the handoff asks for.
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

  const active = photos.length ? frame % photos.length : 0
  const cycleMs = Math.max(photos.length, 1) * FRAME_MS

  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', width: 360, maxWidth: '82vw',
        border: `1px solid ${hover ? 'var(--color-accent)' : 'var(--color-divider)'}`,
        borderRadius: 'var(--radius-md)', overflow: 'hidden', color: 'var(--color-text)',
        transition: 'border-color .25s ease',
      }}
    >
      <div style={{ position: 'relative', height: 220, overflow: 'hidden', background: 'var(--color-divider)' }}>
        {photos.map((src, i) => (
          <div
            key={src}
            className="kb-layer"
            data-on={i === active ? '1' : '0'}
            // The move index changes every time a layer comes back round, which
            // is what restarts the CSS animation.
            data-move={String(frame % MOVES)}
            style={{ backgroundImage: `url(${JSON.stringify(src).slice(1, -1)})` }}
          />
        ))}
        {photos.length > 1 && (
          <div style={{
            position: 'absolute', left: 16, right: 16, bottom: 14, height: 3,
            background: 'color-mix(in srgb, #fff 35%, transparent)', borderRadius: 999, overflow: 'hidden',
          }}>
            <span style={{
              display: 'block', height: '100%', background: 'rgba(255,255,255,.95)', borderRadius: 999,
              animation: `ue-ticker-run ${cycleMs}ms linear infinite`,
              animationPlayState: hover ? 'running' : 'paused',
            }} />
          </div>
        )}
      </div>

      <div style={{ padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div className="kicker">{kicker}</div>
        <div style={{ fontSize: 22, fontWeight: 500 }}>{name}</div>
        {/* Grows so the progress bar below sits at the same height on every
            card, however long the meta line wraps. */}
        <div className="muted" style={{ fontSize: 15, flex: 1 }}>{meta}</div>

        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>Готовность строительства</span>
            <span>{progressPct == null ? 'нет данных' : `${progressPct}%`}</span>
          </div>
          <div style={{ marginTop: 6, height: 3, background: 'var(--color-divider)' }}>
            <div style={{ width: `${progressPct ?? 0}%`, height: '100%', background: 'var(--color-accent)' }} />
          </div>
        </div>

        <div style={{
          marginTop: 14, fontSize: 15, color: 'var(--color-accent-700)',
          opacity: hover ? 1 : 0, transform: hover ? 'translateY(0)' : 'translateY(3px)',
          transition: 'opacity .25s ease, transform .25s ease',
        }}>
          Смотреть комплекс →
        </div>
        {note && <div className="muted" style={{ fontSize: 13 }}>{note}</div>}
      </div>
    </a>
  )
}
