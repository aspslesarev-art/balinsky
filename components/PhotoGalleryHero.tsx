'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, X, ImageIcon } from 'lucide-react'
import { WishlistButton, type WishlistInput } from './WishlistButton'

const COPY = {
  ru: { open: 'Открыть галерею', photoN: (n: number) => `Фото ${n}`, more: (n: number) => `+${n} фото`, count: (n: number) => `${n} фото`, close: 'Закрыть', prev: 'Предыдущее', next: 'Следующее', mainPhoto: 'главное фото', photoLabel: 'фото', thumb: 'миниатюра' },
  en: { open: 'Open gallery',    photoN: (n: number) => `Photo ${n}`, more: (n: number) => `+${n} photos`, count: (n: number) => `${n} photos`, close: 'Close', prev: 'Previous', next: 'Next', mainPhoto: 'main photo', photoLabel: 'photo', thumb: 'thumb' },
} as const

export function PhotoGalleryHero({
  photos,
  alt,
  wishlistItem,
}: {
  photos: string[]
  alt: string
  // When provided, a heart toggle is overlaid on the gallery's
  // top-right corner. Plain object only — no thunks (would break RSC
  // serialisation when called from a server-rendered detail page).
  wishlistItem?: WishlistInput
}) {
  const [openAt, setOpenAt] = useState<number | null>(null)
  const pathname = usePathname() ?? ''
  const lang = pathname.startsWith('/en') ? 'en' : 'ru'
  const c = COPY[lang]

  if (photos.length === 0) {
    return (
      <div className="rounded-3xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-search-bg)] h-[340px] md:h-[480px] flex items-center justify-center text-5xl text-[#B8C3BC] relative">
        🏝️
        {wishlistItem && (
          <WishlistButton item={wishlistItem} className="absolute top-4 right-4 z-10" />
        )}
      </div>
    )
  }

  const hero = photos[0]
  // How many photos render in the right column on desktop. Caps at 4
  // because that's all the 2x2 grid can show — anything beyond rolls
  // into the "+N more" overlay on the last thumb.
  const rightCount = Math.min(photos.length - 1, 4)
  const thumbs = photos.slice(1, 1 + rightCount)
  const remaining = Math.max(0, photos.length - 5)

  // Pick a layout shape that fills the right column nicely no matter
  // how many photos we have. The grid below keeps the same outer
  // height (480px) and just changes the internal track layout so two
  // photos render as a clean 50/50 split, three as 1+2-stacked,
  // four+ as the original 2x2 grid.
  let rightGridClass = ''
  if (rightCount === 1) {
    // Single full-height tile on the right — splits the hero 50/50.
    rightGridClass = 'grid grid-cols-1 grid-rows-1'
  } else if (rightCount === 2) {
    // Two photos stacked vertically on the right — each 50% height.
    rightGridClass = 'grid grid-cols-1 grid-rows-2'
  } else if (rightCount === 3) {
    // Three photos: top row spans full width, bottom row splits in two.
    rightGridClass = 'grid grid-cols-2 grid-rows-2 [&>:first-child]:col-span-2'
  } else {
    // Four photos: standard 2x2 grid.
    rightGridClass = 'grid grid-cols-2 grid-rows-2'
  }

  // Mobile: with 2+ photos render a 2-up split (hero on top, second
  // photo below) rather than just the hero — gives the second photo
  // some visibility on phones too.
  return (
    <>
      {/* Desktop: hero + adaptive right column */}
      <div className="hidden md:flex gap-2 rounded-3xl overflow-hidden border border-[var(--color-border)] h-[480px] relative">
        {wishlistItem && (
          <WishlistButton item={wishlistItem} className="absolute top-4 right-4 z-10" />
        )}
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          className={`relative bg-[var(--color-search-bg)] cursor-pointer overflow-hidden group ${rightCount === 0 ? 'flex-1' : 'flex-1'}`}
          aria-label={c.open}
        >
          <img src={hero} alt={`${alt} — ${c.mainPhoto}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        </button>
        {rightCount > 0 && (
          <div className={`flex-1 ${rightGridClass} gap-2`}>
            {thumbs.map((src, i) => {
              const isLastThumb = i === thumbs.length - 1
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOpenAt(i + 1)}
                  className="relative bg-[var(--color-search-bg)] cursor-pointer overflow-hidden group"
                  aria-label={c.photoN(i + 2)}
                >
                  <img src={src} alt={`${alt} — ${c.photoLabel} ${i + 2}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                  {isLastThumb && remaining > 0 && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white">
                      <div className="flex items-center gap-2 text-[15px] font-medium">
                        <ImageIcon size={18} />
                        {c.more(remaining)}
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Mobile: hero + count badge. mx-3 pushes the card off the
          page padding (px-6 on PageContainer) so the gallery reads
          as an inset element with breathing room on the sides,
          matching how cards on the catalog feel framed instead of
          flush with the screen edge. */}
      <div className="md:hidden mx-3 rounded-2xl overflow-hidden border border-[var(--color-border)] relative">
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          className="block w-full h-[280px] bg-[var(--color-search-bg)]"
        >
          <img src={hero} alt={`${alt} — ${c.mainPhoto}`} className="w-full h-full object-cover" />
          {photos.length > 1 && (
            <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 text-white text-[13px] font-medium">
              <ImageIcon size={14} />
              {c.count(photos.length)}
            </div>
          )}
        </button>
        {wishlistItem && (
          <WishlistButton item={wishlistItem} className="absolute top-3 right-3 z-10" />
        )}
      </div>

      {openAt != null && (
        <Lightbox
          photos={photos}
          startIndex={openAt}
          alt={alt}
          onClose={() => setOpenAt(null)}
          copy={c}
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
  copy,
}: {
  photos: string[]
  startIndex: number
  alt: string
  onClose: () => void
  copy: { close: string; prev: string; next: string; thumb: string }
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
        aria-label={copy.close}
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
            aria-label={copy.prev}
            className="absolute left-4 md:left-8 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center backdrop-blur-sm"
          >
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label={copy.next}
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
              <img src={src} alt={`${alt} — ${copy.thumb} ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
