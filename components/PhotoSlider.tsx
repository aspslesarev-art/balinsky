'use client'

import { useEffect, useRef, useState } from 'react'

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

  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  // null until first client effect resolves — avoids attaching the wrong
  // set of handlers in the SSR/hydration window.
  const [hoverDevice, setHoverDevice] = useState<boolean | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setHoverDevice(window.matchMedia('(hover: hover)').matches)
  }, [])

  // Ping-pong state — only meaningful while active.
  const [layerAIdx, setLayerAIdx] = useState(0)
  const [layerBIdx, setLayerBIdx] = useState(autoCount > 1 ? 1 : 0)
  const [front, setFront] = useState<'a' | 'b'>('a')
  const [tick, setTick] = useState(0)

  const [orientA, setOrientA] = useState<Orient>('square')
  const [orientB, setOrientB] = useState<Orient>('square')
  const [baseOrient, setBaseOrient] = useState<Orient>('square')

  const visibleIdx = front === 'a' ? layerAIdx : layerBIdx

  // Viewport observer:
  // - all devices: stop when the card scrolls off
  // - touch devices (no real hover): also auto-start when the card is
  //   the dominantly-visible thing on screen — TikTok/Reels style. We
  //   activate at 85% visible and only release below 40%, so a quick
  //   pause on a card kicks the slideshow off without it flickering on
  //   and off as the user drags through.
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) { setActive(false); return }
        if (hoverDevice === false) {
          if (entry.intersectionRatio >= 0.85) setActive(true)
          else if (entry.intersectionRatio < 0.4) setActive(false)
        }
      },
      { threshold: [0, 0.4, 0.85, 1] },
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [hoverDevice])

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

  // Pointer handlers — only on devices with a real hover (desktop with
  // mouse / trackpad). Touch devices get auto-activation from the
  // viewport observer above, so attaching mouse handlers there would
  // double-fire on tap. Focus is always wired for keyboard nav.
  const pointerHandlers = hoverDevice === true ? {
    onMouseEnter: () => setActive(true),
    onMouseLeave: () => setActive(false),
  } : {}

  // The base image: always rendered, normal img tag, lazy. SEO + LCP
  // unaffected because no JS or extra requests gate this.
  return (
    <div
      ref={ref}
      {...pointerHandlers}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
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

      {/* Reels-style progress bar — one segment per photo in the auto
          window. Past segments are filled, current animates 0 → 100 %
          in sync with ADVANCE_MS, future segments empty. Only visible
          while the slideshow is actually playing. */}
      {active && autoCount > 1 && (
        <div className="pointer-events-none absolute left-3 right-3 bottom-3 flex items-center gap-1 z-[2]">
          {Array.from({ length: autoCount }).map((_, idx) => (
            <div key={idx} className="flex-1 h-[2.5px] bg-white/35 rounded-full overflow-hidden">
              <div
                key={`${idx}-${tick}`}
                className="h-full bg-white rounded-full"
                style={{
                  width: idx < visibleIdx ? '100%' : idx === visibleIdx ? '100%' : '0%',
                  animation: idx === visibleIdx ? `photo-progress ${ADVANCE_MS}ms linear forwards` : undefined,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Suppress unused-warnings: baseOrient kept in case we want a Ken Burns
          on the static base image too (currently it stays put). */}
      <span hidden>{baseOrient}</span>
    </div>
  )
}
