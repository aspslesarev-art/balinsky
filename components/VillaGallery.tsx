'use client'

// Gallery for the villa page in the ЦИАН-style layout: one big photo plus a
// strip of thumbnails. Every photo opens the shared full-screen Lightbox
// (components/PhotoGalleryHero); the «N видео» / «Планировка» chips jump to
// their sections on the page (#video / #plan).

import { useState } from 'react'
import Image from 'next/image'
import { Lightbox } from './PhotoGalleryHero'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { photos: 'фото', videos: 'видео', plan: 'Планировка', open: 'Открыть фото', close: 'Закрыть', prev: 'Предыдущее', next: 'Следующее', thumb: 'миниатюра' },
  en: { photos: 'photos', videos: 'videos', plan: 'Floor plan', open: 'Open photo', close: 'Close', prev: 'Previous', next: 'Next', thumb: 'thumb' },
  id: { photos: 'foto', videos: 'video', plan: 'Denah', open: 'Buka foto', close: 'Tutup', prev: 'Sebelumnya', next: 'Berikutnya', thumb: 'gambar kecil' },
  fr: { photos: 'photos', videos: 'vidéos', plan: 'Plan', open: 'Ouvrir la photo', close: 'Fermer', prev: 'Précédent', next: 'Suivant', thumb: 'miniature' },
  de: { photos: 'Fotos', videos: 'Videos', plan: 'Grundriss', open: 'Foto öffnen', close: 'Schließen', prev: 'Zurück', next: 'Weiter', thumb: 'Miniatur' },
  zh: { photos: '照片', videos: '视频', plan: '平面图', open: '查看照片', close: '关闭', prev: '上一张', next: '下一张', thumb: '缩略图' },
  nl: { photos: "foto's", videos: "video's", plan: 'Plattegrond', open: 'Foto openen', close: 'Sluiten', prev: 'Vorige', next: 'Volgende', thumb: 'miniatuur' },
  ban: { photos: 'poto', videos: 'vidéo', plan: 'Denah', open: 'Buka foto', close: 'Nutup', prev: 'Sadurungné', next: 'Salanturné', thumb: 'gambar alit' },
  pl: { photos: 'zdjęć', videos: 'wideo', plan: 'Rzut', open: 'Otwórz zdjęcie', close: 'Zamknij', prev: 'Poprzednie', next: 'Następne', thumb: 'miniatura' },
  uk: { photos: 'фото', videos: 'відео', plan: 'Планування', open: 'Відкрити фото', close: 'Закрити', prev: 'Попереднє', next: 'Наступне', thumb: 'мініатюра' },
} as const

const chip = 'text-white text-[14px] px-4 py-2.5 no-underline hover:bg-white/[0.12] focus-visible:bg-white/[0.12] transition-colors'

export function VillaGallery({ photos, alts, title, videoCount, hasPlan, lang }: {
  photos: string[]
  alts?: (string | undefined)[]
  title: string
  videoCount: number
  hasPlan: boolean
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const [openAt, setOpenAt] = useState<number | null>(null)
  if (photos.length === 0) return null

  const thumbs = photos.slice(1, 5)
  const rest = photos.length - 1 - thumbs.length

  return (
    <section className="flex flex-col gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          aria-label={c.open}
          className="block w-full cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <Image
            src={photos[0]}
            alt={alts?.[0] ?? title}
            width={920}
            height={480}
            sizes="(min-width: 1024px) 720px, 100vw"
            priority
            className="w-full h-[300px] sm:h-[400px] md:h-[480px] object-cover rounded-xl"
          />
        </button>
        <div className="absolute left-1/2 bottom-4 -translate-x-1/2 flex bg-[rgb(16_24_20/0.8)] rounded-lg overflow-hidden whitespace-nowrap">
          <button type="button" onClick={() => setOpenAt(0)} className={`${chip} font-semibold bg-white/[0.16]`}>
            {photos.length} {c.photos}
          </button>
          {videoCount > 0 && <a href="#video" className={chip}>{videoCount} {c.videos}</a>}
          {hasPlan && <a href="#plan" className={chip}>{c.plan}</a>}
        </div>
      </div>

      {thumbs.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {thumbs.map((p, i) => {
            const idx = i + 1
            const isLast = i === thumbs.length - 1 && rest > 0
            return (
              <button
                key={p}
                type="button"
                onClick={() => setOpenAt(idx)}
                aria-label={`${c.open} ${idx + 1}`}
                className="relative h-[72px] cursor-zoom-in rounded-lg overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                <Image src={p} alt={alts?.[idx] ?? title} width={160} height={72} sizes="160px" className="w-full h-full object-cover" />
                {isLast && (
                  <span className="absolute inset-0 flex items-center justify-center bg-[rgb(16_24_20/0.55)] text-white text-[14px] font-semibold">
                    +{rest} {c.photos}
                  </span>
                )}
              </button>
            )
          })}
          {hasPlan && (
            <a href="#plan" className="h-[72px] rounded-lg bg-[#EEF6F1] hidden sm:flex flex-col items-center justify-center gap-0.5 no-underline hover:bg-[#E2F0E8] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B6E4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/><path d="M14 14h4v4h-4z"/></svg>
              <span className="text-[11px] text-[#1B6E4A] font-medium">{c.plan}</span>
            </a>
          )}
        </div>
      )}

      {openAt != null && (
        <Lightbox
          photos={photos}
          startIndex={openAt}
          alt={title}
          alts={alts}
          onClose={() => setOpenAt(null)}
          copy={c}
        />
      )}
    </section>
  )
}
