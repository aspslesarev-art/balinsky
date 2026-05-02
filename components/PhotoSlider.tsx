'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Lazy slideshow inside a card. The first photo is a regular <img loading=
// "lazy"> for SEO + LCP; everything else is mounted only after the user
// hovers/focuses (desktop) or taps (mobile). Two layers ping-pong with
// orientation-aware Ken Burns and a crossfade timed to land mid-motion.
//
// Stops + resets to the first photo on mouse leave / blur / scroll-off.
const AUTO_PHOTOS = 5
const ADVANCE_MS = 3000

type Orient = 'square' | 'wide' | 'tall'
function detectOrientation(img: HTMLImageElement): Orient {
  const w = img.naturalWidth, h = img.naturalHeight
  if (!w || !h) return 'square'
  const r = w / h
  if (r > 1.2)  return 'wide'
  if (r < 0.85) return 'tall'
  return 'square'
}

export function PhotoSlider({
  photos,
  alt,
  heightClass = 'h-[360px]',
}: {
  photos: string[]
  alt: string
  heightClass?: string
}) {
  const count = photos.length
  const autoCount = Math.min(count, AUTO_PHOTOS)
  const dots = Math.min(10, count)

  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  // Ping-pong state — only meaningful while active.
  const [layerAIdx, setLayerAIdx] = useState(0)
  const [layerBIdx, setLayerBIdx] = useState(autoCount > 1 ? 1 : 0)
  const [front, setFront] = useState<'a' | 'b'>('a')
  const [tick, setTick] = useState(0)

  const [orientA, setOrientA] = useState<Orient>('square')
  const [orientB, setOrientB] = useState<Orient>('square')
  const [baseOrient, setBaseOrient] = useState<Orient>('square')

  const visibleIdx = front === 'a' ? layerAIdx : layerBIdx

  // Stop + reset when the card scrolls off screen.
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) setActive(false) },
      { threshold: 0 },
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  // Reset to first photo whenever active toggles off.
  useEffect(() => {
    if (active) return
    setFront('a')
    setLayerAIdx(0)
    setLayerBIdx(autoCount > 1 ? 1 : 0)
    setTick(0)
  }, [active, autoCount])

  // Tick advance only while active. Respect prefers-reduced-motion.
  useEffect(() => {
    if (!active || autoCount <= 1) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setTick(t => t + 1), ADVANCE_MS)
    return () => clearInterval(id)
  }, [active, autoCount])

  // Each tick flips which layer is on top.
  useEffect(() => {
    if (tick === 0) return
    setFront(prev => (prev === 'a' ? 'b' : 'a'))
  }, [tick])

  // After front swaps, queue the next photo into the now-hidden layer.
  useEffect(() => {
    if (!active || autoCount <= 1) return
    const visIdx = front === 'a' ? layerAIdx : layerBIdx
    const upcoming = (visIdx + 1) % autoCount
    if (front === 'a') setLayerBIdx(upcoming)
    else setLayerAIdx(upcoming)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front, active, autoCount])

  if (count === 0) {
    return (
      <div
        className={`relative w-full ${heightClass} bg-[var(--color-border)] flex items-center justify-center text-5xl text-[#B8C3BC]`}
      >
        🏝️
      </div>
    )
  }

  // Manual nav — flips through the auto window via the same crossfade path.
  const go = (delta: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.blur()
    if (autoCount <= 1) return
    setActive(true)
    const next = (visibleIdx + delta + autoCount) % autoCount
    if (front === 'a') {
      setLayerBIdx(next)
      setFront('b')
    } else {
      setLayerAIdx(next)
      setFront('a')
    }
  }

  // The base image: always rendered, normal img tag, lazy. SEO + LCP
  // unaffected because no JS or extra requests gate this.
  return (
    <div
      ref={ref}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onTouchStart={() => setActive(true)}
      tabIndex={-1}
      className={`group/slider relative w-full ${heightClass} bg-[var(--color-border)] overflow-hidden`}
    >
      <img
        src={photos[0]}
        alt={alt}
        loading="lazy"
        onLoad={e => setBaseOrient(detectOrientation(e.currentTarget))}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[600ms] ${
          active && autoCount > 1 ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {active && autoCount > 1 && (
        <>
          <img
            src={photos[layerAIdx]}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onLoad={e => setOrientA(detectOrientation(e.currentTarget))}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
              front === 'a' ? 'opacity-100' : 'opacity-0'
            } photo-kenburns-${orientA}-in`}
          />
          <img
            src={photos[layerBIdx]}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onLoad={e => setOrientB(detectOrientation(e.currentTarget))}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
              front === 'b' ? 'opacity-100' : 'opacity-0'
            } photo-kenburns-${orientB}-out`}
          />
        </>
      )}

      {/* Subtle overlay for "premium" depth — only on hover so static cards stay flat. */}
      {active && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent z-[1]" />
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            onClick={go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] inline-flex items-center justify-center text-[var(--color-text)] opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            onClick={go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] inline-flex items-center justify-center text-[var(--color-text)] opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 transition-opacity z-10"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {Array.from({ length: dots }).map((_, idx) => {
              const dotIdx = active ? Math.min(visibleIdx, dots - 1) : 0
              const isActive = idx === dotIdx
              return (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-white ring-1 ring-white/80' : 'bg-white/50'
                  }`}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Suppress unused-warnings: baseOrient kept in case we want a Ken Burns
          on the static base image too (currently it stays put). */}
      <span hidden>{baseOrient}</span>
    </div>
  )
}
