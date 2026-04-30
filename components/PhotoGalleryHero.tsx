'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, ImageIcon } from 'lucide-react'

export function PhotoGalleryHero({
  photos,
  alt,
}: {
  photos: string[]
  alt: string
}) {
  const [openAt, setOpenAt] = useState<number | null>(null)

  if (photos.length === 0) {
    return (
      <div className="rounded-3xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-search-bg)] h-[340px] md:h-[480px] flex items-center justify-center text-5xl text-[#B8C3BC]">
        🏝️
      </div>
    )
  }

  const hero = photos[0]
  const thumbs = photos.slice(1, 5)
  const remaining = Math.max(0, photos.length - 5)

  return (
    <>
      {/* Desktop: hero + 2x2 thumbs */}
      <div className="hidden md:flex gap-2 rounded-3xl overflow-hidden border border-[var(--color-border)] h-[480px]">
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          className="flex-1 relative bg-[var(--color-search-bg)] cursor-pointer overflow-hidden group"
          aria-label="Открыть галерею"
        >
          <img src={hero} alt={`${alt} — главное фото`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        </button>
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2">
          {thumbs.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setOpenAt(i + 1)}
              className="relative bg-[var(--color-search-bg)] cursor-pointer overflow-hidden group"
              aria-label={`Фото ${i + 2}`}
            >
              <img src={src} alt={`${alt} — фото ${i + 2}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
              {i === 3 && remaining > 0 && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white">
                  <div className="flex items-center gap-2 text-[15px] font-medium">
                    <ImageIcon size={18} />
                    +{remaining} фото
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: hero only with "all photos" button */}
      <div className="md:hidden rounded-2xl overflow-hidden border border-[var(--color-border)] relative">
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          className="block w-full h-[280px] bg-[var(--color-search-bg)]"
        >
          <img src={hero} alt={`${alt} — главное фото`} className="w-full h-full object-cover" />
          {photos.length > 1 && (
            <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 text-white text-[13px] font-medium">
              <ImageIcon size={14} />
              {photos.length} фото
            </div>
          )}
        </button>
      </div>

      {openAt != null && (
        <Lightbox
          photos={photos}
          startIndex={openAt}
          alt={alt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  )
}

function Lightbox({
  photos,
  startIndex,
  alt,
  onClose,
}: {
  photos: string[]
  startIndex: number
  alt: string
  onClose: () => void
}) {
  const [i, setI] = useState(startIndex)
  const count = photos.length

  const prev = useCallback(() => setI(idx => (idx - 1 + count) % count), [count])
  const next = useCallback(() => setI(idx => (idx + 1) % count), [count])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, prev, next])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center backdrop-blur-sm"
      >
        <X size={20} />
      </button>

      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/15 text-white text-[13px] font-medium backdrop-blur-sm">
        {i + 1} / {count}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Предыдущее"
            className="absolute left-4 md:left-8 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center backdrop-blur-sm"
          >
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Следующее"
            className="absolute right-4 md:right-8 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center backdrop-blur-sm"
          >
            <ChevronRight size={26} strokeWidth={2.5} />
          </button>
        </>
      )}

      <img
        src={photos[i]}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl select-none"
      />

      {/* Strip of small thumbs */}
      {count > 1 && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 max-w-[90vw] overflow-x-auto px-2 py-2 rounded-xl bg-white/8 backdrop-blur-sm"
        >
          {photos.map((src, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              className={`shrink-0 w-14 h-10 md:w-16 md:h-12 rounded-md overflow-hidden border-2 ${
                idx === i ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={src} alt={`${alt} — миниатюра ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
