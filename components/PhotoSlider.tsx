'use client'

import { useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'

// Lazy slideshow inside a card. The first photo renders as next/image for
// SEO + LCP; everything else is mounted only after the user hovers/focuses
// (desktop) or the card dominates the viewport (mobile).
//
// Stack model — only the top photo fades, the next is already at 100 %
// opacity behind it. Each photo gets ONE continuous motion preset
// (rotated by photo index) that runs for its full on-screen lifetime,
// so there's no zoom-in-then-zoom-out pulsation between cuts.
//
// Two physical layers (A, B) swap top/bottom roles each step. Since
// each photo lives in its layer for two consecutive steps (1 step as
// bottom, 1 step as top), we set animation duration to 2 × ADVANCE_MS
// and let it run continuously — the swap happens mid-motion.
const AUTO_PHOTOS = 5
const ADVANCE_MS = 2000
const FADE_MS = 600
const PRESET_COUNT = 6
const ANIM_DURATION = 2 * ADVANCE_MS // photo's on-screen lifetime

export function PhotoSlider({
  photos,
  alt,
  heightClass = 'h-[360px]',
  trackingId,
}: {
  photos: string[]
  alt: string
  heightClass?: string
  // Slug or id used to attribute the random first-impression to a
  // specific listing in Yandex Metrika. Optional — without it the
  // randomisation still works, just no analytics tag.
  trackingId?: string
}) {
  const count = photos.length
  const autoCount = Math.min(count, AUTO_PHOTOS)

  // Slideshow always starts from photos[0] — the first photo is the
  // hero everyone sees in the SSR output, in og:image previews, and in
  // search results, so we keep that order stable. Below we only TRACK
  // which photo was on screen at engagement / click moments — the
  // ordering itself stays in Airtable.
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
  // Engagement event fires once per "session" — the visitor either
  // hovered (desktop) or stopped scrolling on the card (mobile). Reset
  // happens when activity stops so re-engagement counts again.
  const engagedRef = useRef(false)
  useEffect(() => {
    if (!active) { engagedRef.current = false; return }
    if (engagedRef.current) return
    engagedRef.current = true
    type Ymetrika = (id: number, action: string, goal: string, params?: Record<string, unknown>) => void
    const ym = (typeof window !== 'undefined') ? (window as unknown as { ym?: Ymetrika }).ym : undefined
    if (ym && trackingId) {
      ym(104881153, 'reachGoal', 'photo_engagement', { listing: trackingId })
    }
  }, [active, trackingId])

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

  // Once the visitor has activated the slideshow, the layers stay
  // mounted (and animations stay where they were) even when activity
  // pauses — so a re-engage picks up exactly where it left off rather
  // than snapping back to photos[0].
  const [everActivated, setEverActivated] = useState(false)
  useEffect(() => { if (active) setEverActivated(true) }, [active])

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

  // Even step: A is top, B is bottom. Odd step: roles swap. Each layer's
  // photo only changes when it's the bottom — never on the visible top.
  const aIsTop = step % 2 === 0
  const topPhotoIdx    = step % autoCount
  const bottomPhotoIdx = (step + 1) % autoCount
  const aPhotoIdx = aIsTop ? topPhotoIdx : bottomPhotoIdx
  const bPhotoIdx = aIsTop ? bottomPhotoIdx : topPhotoIdx

  // Click capture — fires before the parent <Link> navigates away. Tells
  // us which photo was on screen at the moment the visitor decided to
  // open the listing. Per-photo CTR (this goal / photo_engagement) is the
  // signal for whether a particular photo is the one that "sells" the card.
  const handleClickCapture = () => {
    type Ymetrika = (id: number, action: string, goal: string, params?: Record<string, unknown>) => void
    const ym = (typeof window !== 'undefined') ? (window as unknown as { ym?: Ymetrika }).ym : undefined
    if (!ym || !trackingId) return
    // When inactive (no slideshow ever started) the visible photo is the base — index 0.
    const visibleAtClick = active ? topPhotoIdx : 0
    ym(104881153, 'reachGoal', 'photo_click_through', {
      listing: trackingId,
      photo_idx: visibleAtClick,
      steps_seen: step,
    })
  }

  // Motion preset is a function of photo index — adjacent photos always
  // get different presets so the eye reads each cut as a real transition,
  // not a repeating pulse.
  const aPreset = aPhotoIdx % PRESET_COUNT
  const bPreset = bPhotoIdx % PRESET_COUNT

  const topOpacityClass = fading ? 'opacity-0' : 'opacity-100'
  const fadeTransition  = `transition-opacity duration-[${FADE_MS}ms] ease-in-out`
  // animation-play-state freezes the Ken Burns + progress sweep mid-flight
  // when the visitor leaves; resuming flips it back to running and the
  // browser carries on from the same transform / width.
  const playState = active ? 'running' : 'paused'
  const animStyle = {
    animationDuration: `${ANIM_DURATION}ms`,
    animationTimingFunction: 'linear',
    animationFillMode: 'forwards',
    animationPlayState: playState,
  } as const

  return (
    <div
      ref={ref}
      {...pointerHandlers}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onClickCapture={handleClickCapture}
      tabIndex={-1}
      className={`group/slider relative w-full ${heightClass} bg-[var(--color-border)] overflow-hidden`}
    >
      {/* Base image — the thing crawlers and first paint see. Goes
          through Vercel image optimization (AVIF / WebP, srcset,
          year-long edge cache). */}
      <NextImage
        src={photos[0]}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        loading="lazy"
        className={`object-cover transition-opacity duration-[600ms] ${
          everActivated && autoCount > 1 ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {everActivated && autoCount > 1 && (
        <>
          {/* Layer A — z-index 2 when top, 1 when bottom */}
          <NextImage
            key={`a-${aPhotoIdx}`}
            src={photos[aPhotoIdx]}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className={`object-cover photo-motion-${aPreset} ${
              aIsTop
                ? `${fadeTransition} ${topOpacityClass} z-[2]`
                : 'opacity-100 z-[1]'
            }`}
            style={animStyle}
          />
          {/* Layer B */}
          <NextImage
            key={`b-${bPhotoIdx}`}
            src={photos[bPhotoIdx]}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className={`object-cover photo-motion-${bPreset} ${
              !aIsTop
                ? `${fadeTransition} ${topOpacityClass} z-[2]`
                : 'opacity-100 z-[1]'
            }`}
            style={animStyle}
          />
        </>
      )}

      {/* Subtle dark overlay while engaged — adds a touch of depth. */}
      {active && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent z-[3]" />
      )}

      {/* One continuous progress bar at the very bottom. Translucent
          track + a single white sweep that fills 0 → 100 % across the
          full slideshow cycle (autoCount × ADVANCE_MS). Pause freezes
          the sweep at its current width via animation-play-state. */}
      {everActivated && autoCount > 1 && (
        <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-[3px] bg-white/30 z-[4]">
          <div
            key={Math.floor(step / autoCount)}
            className="h-full bg-white"
            style={{
              animation: `photo-progress ${autoCount * ADVANCE_MS}ms linear forwards`,
              animationPlayState: playState,
            }}
          />
        </div>
      )}
    </div>
  )
}
