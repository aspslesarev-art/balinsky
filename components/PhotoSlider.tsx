'use client'

import { useEffect, useRef, useState } from 'react'

// Lazy slideshow inside a card. The first photo is a regular <img loading=
// "lazy"> for SEO + LCP; everything else is mounted only after the user
// hovers/focuses (desktop) or the card dominates the viewport (mobile).
//
// Stack model — only the top photo fades, the next is already at 100 %
// opacity behind it, so transitions never show a half-blended pair.
//
// Two physical layers (A, B) swap roles each step:
//   - top layer (visible / fading): runs kenburns-in, scale 1.0 → 1.10
//   - bottom layer (steady, opacity 1): runs kenburns-out, scale 1.10 → 1.0
// At step boundary the layer that was top ends at scale 1.10, then becomes
// bottom and starts kenburns-out from 1.10 — continuous. Symmetric for B.
const AUTO_PHOTOS = 5
const ADVANCE_MS = 3000
const FADE_MS = 700

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

  // Step counter — increments on each tick. Photo on top is photos[step%n],
  // photo behind it (steady, ready to take over) is photos[(step+1)%n].
  const [step, setStep] = useState(0)
  // True during the FADE_MS window where the top is fading out and the
  // step++ swap is about to happen.
  const [fading, setFading] = useState(false)

  const [orientA, setOrientA] = useState<Orient>('square')
  const [orientB, setOrientB] = useState<Orient>('square')
  const [baseOrient, setBaseOrient] = useState<Orient>('square')

  // Viewport observer: stop on scroll-off; on touch devices also auto-start
  // when the card dominates the viewport (TikTok / Reels feel).
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

  // Reset when slideshow stops.
  useEffect(() => {
    if (active) return
    setStep(0)
    setFading(false)
  }, [active])

  // Preload all photos in the auto window so swaps never flash.
  useEffect(() => {
    if (!active) return
    photos.slice(0, autoCount).forEach(src => {
      const img = new Image()
      img.src = src
    })
  }, [active, autoCount, photos])

  // Tick driver: every ADVANCE_MS we start the fade, then FADE_MS later
  // commit the step (which swaps physical roles and loads the next photo
  // into what becomes the new bottom).
  useEffect(() => {
    if (!active || autoCount <= 1) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const fadeTimers: ReturnType<typeof setTimeout>[] = []
    const interval = setInterval(() => {
      setFading(true)
      fadeTimers.push(setTimeout(() => {
        setStep(s => s + 1)
        setFading(false)
      }, FADE_MS))
    }, ADVANCE_MS)
    return () => {
      clearInterval(interval)
      fadeTimers.forEach(clearTimeout)
    }
  }, [active, autoCount])

  if (count === 0) {
    return (
      <div
        className={`relative w-full ${heightClass} bg-[var(--color-border)] flex items-center justify-center text-5xl text-[#B8C3BC]`}
      >
        🏝️
      </div>
    )
  }

  // Pointer handlers — desktop only. Touch path goes through observer.
  const pointerHandlers = hoverDevice === true ? {
    onMouseEnter: () => setActive(true),
    onMouseLeave: () => setActive(false),
  } : {}

  // Even step: A is top, B is bottom. Odd step: roles swap.
  // Each layer's photo only changes when it's the bottom layer — so the
  // visible top never has its src updated mid-frame.
  const aIsTop = step % 2 === 0
  const topPhotoIdx    = step % autoCount
  const bottomPhotoIdx = (step + 1) % autoCount
  const aPhotoIdx = aIsTop ? topPhotoIdx : bottomPhotoIdx
  const bPhotoIdx = aIsTop ? bottomPhotoIdx : topPhotoIdx

  // The top layer fades when `fading` is true; the bottom layer is always
  // fully opaque so the next photo is already 100% visible underneath.
  const topOpacityClass = fading ? 'opacity-0' : 'opacity-100'
  const fadeTransition  = `transition-opacity duration-[${FADE_MS}ms] ease-in-out`

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
          {/* Layer A — z-index 2 when top, 1 when bottom */}
          <img
            key={`a-${aPhotoIdx}`}
            src={photos[aPhotoIdx]}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onLoad={e => setOrientA(detectOrientation(e.currentTarget))}
            className={`absolute inset-0 w-full h-full object-cover ${
              aIsTop
                ? `${fadeTransition} ${topOpacityClass} z-[2] photo-kenburns-${orientA}-in`
                : `opacity-100 z-[1] photo-kenburns-${orientA}-out`
            }`}
            style={{
              animationDuration: `${ADVANCE_MS + FADE_MS}ms`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
            }}
          />
          {/* Layer B */}
          <img
            key={`b-${bPhotoIdx}`}
            src={photos[bPhotoIdx]}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onLoad={e => setOrientB(detectOrientation(e.currentTarget))}
            className={`absolute inset-0 w-full h-full object-cover ${
              !aIsTop
                ? `${fadeTransition} ${topOpacityClass} z-[2] photo-kenburns-${orientB}-in`
                : `opacity-100 z-[1] photo-kenburns-${orientB}-out`
            }`}
            style={{
              animationDuration: `${ADVANCE_MS + FADE_MS}ms`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
            }}
          />
        </>
      )}

      {/* Subtle dark overlay only while playing — adds a touch of depth. */}
      {active && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent z-[3]" />
      )}

      {/* Continuous progress bar at the very bottom. One translucent track,
          one white sweep that fills 0 → 100 % across the FULL slideshow
          cycle (autoCount × ADVANCE_MS), so for 5 photos × 3 s the bar
          reaches a fifth at every swap and only restarts after the loop. */}
      {active && autoCount > 1 && (
        <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-[3px] bg-white/30 z-[4]">
          <div
            key={Math.floor(step / autoCount)}
            className="h-full bg-white"
            style={{
              animation: `photo-progress ${autoCount * ADVANCE_MS}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* Suppress unused-warnings: baseOrient kept in case we want a Ken
          Burns on the static base image too (currently it stays put). */}
      <span hidden>{baseOrient}</span>
    </div>
  )
}
