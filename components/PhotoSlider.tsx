'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
  const count = photos.length
  const dots = Math.min(10, count)

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

  return (
    <div className={`group/slider relative w-full ${heightClass} bg-[var(--color-border)] overflow-hidden`}>
      <img
        src={photos[i]}
        alt={count > 1 ? `${alt} — фото ${i + 1} из ${count}` : alt}
        loading="lazy"
        className="w-full h-full object-cover"
      />

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            onClick={go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] inline-flex items-center justify-center text-[var(--color-text)] opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            onClick={go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] inline-flex items-center justify-center text-[var(--color-text)] opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
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
