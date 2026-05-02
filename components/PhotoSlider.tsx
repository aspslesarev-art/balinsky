'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// "Live" card — two image layers continuously ping-pong: layer A
// zooms 1.0 → 1.10, layer B zooms 1.10 → 1.0, both 6 s, infinite
// alternate. Every 3 s we swap which layer is on top, which is also
// the moment both are at scale 1.05 — the crossfade happens while
// both layers are mid-motion, so nothing ever sits still.
//
// Hidden layer's photo is swapped to the next one *before* it fades
// in, so by the time it's visible the right image is already there.
const AUTO_PHOTOS = 4
const ADVANCE_MS = 3000

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
  const [inView, setInView] = useState(false)

  // Two-layer ping-pong state.
  const [layerAIdx, setLayerAIdx] = useState(0)
  const [layerBIdx, setLayerBIdx] = useState(autoCount > 1 ? 1 : 0)
  const [front, setFront] = useState<'a' | 'b'>('a')
  const [tick, setTick] = useState(0)

  // Aspect ratio of each layer's current photo — picks the pan direction.
  // Detected on load: wide → pan X, tall → pan Y, otherwise pure zoom.
  type Orient = 'square' | 'wide' | 'tall'
  const [orientA, setOrientA] = useState<Orient>('square')
  const [orientB, setOrientB] = useState<Orient>('square')
  const detect = (img: HTMLImageElement): Orient => {
    const w = img.naturalWidth, h = img.naturalHeight
    if (!w || !h) return 'square'
    const r = w / h
    if (r > 1.2)  return 'wide'
    if (r < 0.85) return 'tall'
    return 'square'
  }

  const visibleIdx = front === 'a' ? layerAIdx : layerBIdx

  useEffect(() => {
    if (!ref.current || autoCount <= 1) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] },
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [autoCount])

  useEffect(() => {
    if (!inView || autoCount <= 1) return
    const id = setInterval(() => setTick(t => t + 1), ADVANCE_MS)
    return () => clearInterval(id)
  }, [inView, autoCount])

  // Each tick flips which layer is on top.
  useEffect(() => {
    if (tick === 0) return
    setFront(prev => (prev === 'a' ? 'b' : 'a'))
  }, [tick])

  // After front swaps, queue the next photo into the now-hidden layer
  // so it's ready before the next crossfade.
  useEffect(() => {
    if (autoCount <= 1) return
    const visIdx = front === 'a' ? layerAIdx : layerBIdx
    const upcoming = (visIdx + 1) % autoCount
    if (front === 'a') setLayerBIdx(upcoming)
    else setLayerAIdx(upcoming)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front, autoCount])

  if (count === 0) {
    return (
      <div
        className={`relative w-full ${heightClass} bg-[var(--color-border)] flex items-center justify-center text-5xl text-[#B8C3BC]`}
      >
        🏝️
      </div>
    )
  }

  // Manual nav within the auto window — sets next photo into the hidden
  // layer then flips front, so the change still flows through a crossfade.
  const go = (delta: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.blur()
    if (autoCount <= 1) return
    const next = (visibleIdx + delta + autoCount) % autoCount
    if (front === 'a') {
      setLayerBIdx(next)
      setFront('b')
    } else {
      setLayerAIdx(next)
      setFront('a')
    }
  }

  return (
    <div ref={ref} className={`group/slider relative w-full ${heightClass} bg-[var(--color-border)] overflow-hidden`}>
      <img
        src={photos[layerAIdx]}
        alt={count > 1 ? `${alt} — фото ${layerAIdx + 1} из ${count}` : alt}
        loading="eager"
        fetchPriority="high"
        onLoad={e => setOrientA(detect(e.currentTarget))}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
          front === 'a' ? 'opacity-100' : 'opacity-0'
        } ${autoCount > 1 && inView ? `photo-kenburns-${orientA}-in` : ''}`}
      />
      {autoCount > 1 && (
        <img
          src={photos[layerBIdx]}
          alt={`${alt} — фото ${layerBIdx + 1} из ${count}`}
          loading="lazy"
          onLoad={e => setOrientB(detect(e.currentTarget))}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
            front === 'b' ? 'opacity-100' : 'opacity-0'
          } ${inView ? `photo-kenburns-${orientB}-out` : ''}`}
        />
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
              const isActive = idx === Math.min(visibleIdx, dots - 1)
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
    </div>
  )
}
