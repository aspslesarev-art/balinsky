'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// "Ожившая карточка" — когда карточка попадает в viewport, фотографии
// плавно сменяют друг друга с лёгким Ken Burns-зумом. Автозамена
// останавливается, когда карточка уходит с экрана. Ручные стрелки
// продолжают работать как раньше.
const AUTO_PHOTOS = 4
// Long enough that the Ken Burns motion gets to develop, short enough
// that you'd actually see all 4 photos before scrolling past.
const ADVANCE_MS = 5200

export function PhotoSlider({
  photos,
  alt,
  heightClass = 'h-[360px]',
}: {
  photos: string[]
  alt: string
  heightClass?: string
}) {
  const [i, setI] = useState(0)
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const count = photos.length
  const autoCount = Math.min(count, AUTO_PHOTOS)
  const dots = Math.min(10, count)

  // Watch the card; auto-advance only while it's actually on screen.
  // Skip entirely when the user has prefers-reduced-motion set.
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
    const id = setInterval(() => setI(prev => (prev + 1) % autoCount), ADVANCE_MS)
    return () => clearInterval(id)
  }, [inView, autoCount])

  if (count === 0) {
    return (
      <div
        className={`relative w-full ${heightClass} bg-[var(--color-border)] flex items-center justify-center text-5xl text-[#B8C3BC]`}
      >
        🏝️
      </div>
    )
  }

  const go = (delta: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.blur()
    setI((i + delta + count) % count)
  }

  // For slots inside the auto-rotating window we render every layer so the
  // crossfade can paint without re-fetching. Manual stepping past the
  // window falls back to swapping the single image source.
  const inAutoWindow = i < autoCount

  return (
    <div ref={ref} className={`group/slider relative w-full ${heightClass} bg-[var(--color-border)] overflow-hidden`}>
      {Array.from({ length: autoCount }).map((_, idx) => {
        const motion = `photo-kenburns-${(idx % 4) + 1}`
        const isActive = inAutoWindow && idx === i
        return (
          <img
            key={idx}
            src={photos[idx]}
            alt={count > 1 ? `${alt} — фото ${idx + 1} из ${count}` : alt}
            loading={idx === 0 ? 'eager' : 'lazy'}
            fetchPriority={idx === 0 ? 'high' : 'auto'}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
              isActive ? `opacity-100 ${motion}` : 'opacity-0'
            }`}
          />
        )
      })}
      {!inAutoWindow && (
        <img
          src={photos[i]}
          alt={`${alt} — фото ${i + 1} из ${count}`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-100"
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
              const isActive = idx === Math.min(i, dots - 1)
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
