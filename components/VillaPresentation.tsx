'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Play, Star, MapPin, BedDouble, Square, Trees, Calendar, FileCheck2, Lock, ArrowUpRight, Download, Loader2, UserRound } from 'lucide-react'
import type { Snapshot } from '@/components/InvestmentWidget/types'
import { fmtUsd, fmtUsdShort, fmtPct, fmtYears, fmtDistance, pluralRu } from '@/components/InvestmentWidget/utils'

export type VillaPresentationData = {
  villaId: string
  slug: string
  title: string
  district: string | null
  photos: string[]
  priceUsd: number | null
  pricePerM2: number | null
  bedrooms: number | null
  area: number | null
  land: number | null
  yearLabel: string | null
  lease: string | null
  permit: string | null
  lat: number | null
  lng: number | null
  seoText: string | null
}

const NEARBY_META: Record<string, { icon: string; title: string }> = {
  beach: { icon: '🏖', title: 'Пляжи' },
  beachclub: { icon: '🍹', title: 'Beach clubs' },
  international_school: { icon: '🎓', title: 'Международные школы' },
  school: { icon: '🏫', title: 'Школы' },
  preschool: { icon: '🧸', title: 'Сады и ясли' },
  wellness: { icon: '🧘', title: 'Йога и фитнес' },
  restaurant: { icon: '🍴', title: 'Рестораны' },
  cafe: { icon: '☕', title: 'Кафе' },
  supermarket: { icon: '🛒', title: 'Магазины' },
  pharmacy: { icon: '💊', title: 'Аптеки' },
  hospital: { icon: '🏥', title: 'Клиники' },
  nightlife: { icon: '🌙', title: 'Бары и клубы' },
  attraction: { icon: '📍', title: 'Достопримечательности' },
}
const NEARBY_ORDER = [
  'beach', 'beachclub', 'wellness',
  'restaurant', 'cafe', 'nightlife',
  'international_school', 'school', 'preschool',
  'supermarket', 'pharmacy', 'hospital', 'attraction',
]

type Slide =
  | { kind: 'cover' }
  | { kind: 'photoset'; photos: string[]; layout: 'mosaic5' | 'grid4' | 'small' }
  | { kind: 'facts' }
  | { kind: 'description'; text: string }
  | { kind: 'map' }
  | { kind: 'nearby' }
  | { kind: 'invest' }

export function VillaPresentationButton(props: VillaPresentationData) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[14px] font-medium px-4 py-2.5 shadow-sm transition-colors"
        aria-label="Открыть презентацию виллы"
      >
        <Play size={15} fill="currentColor" />
        Презентация
      </button>
      {open && <VillaPresentation data={props} onClose={() => setOpen(false)} />}
    </>
  )
}

function VillaPresentation({ data, onClose }: { data: VillaPresentationData; onClose: () => void }) {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [snapTried, setSnapTried] = useState(false)
  const [i, setI] = useState(0)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const touchX = useRef<number | null>(null)

  // Fetch investment snapshot once
  useEffect(() => {
    let cancelled = false
    fetch(`/api/villa/${data.villaId}/investment-snapshot`)
      .then(r => (r.ok ? r.json() : null))
      .then(s => { if (!cancelled) { setSnap(s); setSnapTried(true) } })
      .catch(() => { if (!cancelled) setSnapTried(true) })
    return () => { cancelled = true }
  }, [data.villaId])

  // Build photoset slides: cover already shows photos[0], so distribute photos[1..] into compositions
  const allPhotos = data.photos.slice(0, 12)
  const photosetPool = allPhotos.slice(1)
  const photosetSlides: Slide[] = []
  if (photosetPool.length >= 5) {
    photosetSlides.push({ kind: 'photoset', photos: photosetPool.slice(0, 5), layout: 'mosaic5' })
    if (photosetPool.length >= 6) {
      photosetSlides.push({ kind: 'photoset', photos: photosetPool.slice(5, 9), layout: 'grid4' })
    }
  } else if (photosetPool.length > 0) {
    photosetSlides.push({ kind: 'photoset', photos: photosetPool, layout: 'small' })
  }

  const slides: Slide[] = [
    { kind: 'cover' },
    ...photosetSlides,
    { kind: 'facts' },
    ...(data.seoText ? [{ kind: 'description' as const, text: data.seoText }] : []),
    ...(data.lat != null && data.lng != null ? [{ kind: 'map' as const }] : []),
    ...(snap && Object.keys(snap.nearbyByCategory ?? {}).length > 0 ? [{ kind: 'nearby' as const }] : []),
    ...(snap?.scenarios ? [{ kind: 'invest' as const }] : []),
  ]
  const total = slides.length
  const safeI = Math.min(i, total - 1)
  const slide = slides[safeI]

  const next = useCallback(() => setI(prev => Math.min(prev + 1, total - 1)), [total])
  const prev = useCallback(() => setI(prev => Math.max(prev - 1, 0)), [])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev() }
      else if (e.key === 'Home') setI(0)
      else if (e.key === 'End') setI(total - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, next, prev, total])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev() }
    touchX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Презентация виллы"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between gap-4 px-4 md:px-8 py-3 text-[#111827]">
        <div className="min-w-0 flex items-center gap-3">
          <div className="text-[12px] uppercase tracking-wider text-[var(--color-text-muted)]">
            {safeI + 1} / {total}
          </div>
          <div className="min-w-0 truncate text-[14px] font-medium">
            {data.title}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDownloadOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[13px] font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white transition-colors"
            aria-label="Скачать презентацию в PDF"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Скачать</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 text-[#111827] transition-colors"
            aria-label="Закрыть презентацию"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {downloadOpen && (
        <DownloadModal
          data={data}
          snap={snap}
          onClose={() => setDownloadOpen(false)}
        />
      )}

      {/* Progress dots */}
      <div className="px-4 md:px-8 pb-2">
        <div className="flex gap-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Слайд ${idx + 1}`}
              className={`h-1 flex-1 rounded-full transition-colors ${
                idx <= safeI ? 'bg-[var(--color-primary)]' : 'bg-black/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Slide body */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <SlideBody slide={slide} data={data} snap={snap} snapTried={snapTried} />

        {/* Click zones: left/right halves for navigation (desktop & tablet) */}
        <button
          type="button"
          onClick={prev}
          aria-label="Предыдущий слайд"
          disabled={safeI === 0}
          className="hidden md:flex absolute left-0 top-0 bottom-0 w-[12%] items-center justify-start pl-3 group focus:outline-none disabled:cursor-default"
        >
          <span className={`opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/5 text-[#111827] ${safeI === 0 ? 'invisible' : ''}`}>
            <ChevronLeft size={22} />
          </span>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Следующий слайд"
          disabled={safeI === total - 1}
          className="hidden md:flex absolute right-0 top-0 bottom-0 w-[12%] items-center justify-end pr-3 group focus:outline-none disabled:cursor-default"
        >
          <span className={`opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/5 text-[#111827] ${safeI === total - 1 ? 'invisible' : ''}`}>
            <ChevronRight size={22} />
          </span>
        </button>
      </div>

      {/* Mobile bottom controls */}
      <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-t border-black/5">
        <button
          type="button"
          onClick={prev}
          disabled={safeI === 0}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/5 text-[#111827] disabled:opacity-30"
          aria-label="Назад"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={next}
          disabled={safeI === total - 1}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] text-white disabled:opacity-30"
          aria-label="Дальше"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

function SlideBody({ slide, data, snap, snapTried }: { slide: Slide; data: VillaPresentationData; snap: Snapshot | null; snapTried: boolean }) {
  switch (slide.kind) {
    case 'cover':       return <CoverSlide data={data} />
    case 'photoset':    return <PhotoSetSlide photos={slide.photos} layout={slide.layout} alt={data.title} />
    case 'facts':       return <FactsSlide data={data} />
    case 'description': return <DescriptionSlide text={slide.text} title={data.title} />
    case 'map':         return <MapSlide data={data} />
    case 'nearby':      return <NearbySlide snap={snap} snapTried={snapTried} />
    case 'invest':      return <InvestSlide snap={snap} priceUsd={data.priceUsd} />
  }
}

function CoverSlide({ data }: { data: VillaPresentationData }) {
  const cover = data.photos[0]
  return (
    <div className="absolute inset-0 px-6 md:px-12 lg:px-16 py-8 md:py-12">
      <div className="h-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 md:gap-10 items-center">
        {/* Text */}
        <div className="order-2 md:order-1 flex flex-col">
          {data.district && (
            <div className="inline-flex items-center gap-1.5 text-[12px] md:text-[13px] uppercase tracking-wider text-[var(--color-primary)] mb-3 font-medium">
              <MapPin size={13} /> {data.district}, Бали
            </div>
          )}
          <h1 className="text-[26px] md:text-[44px] lg:text-[56px] font-semibold tracking-tight leading-[1.05] text-[#111827]">
            {data.title}
          </h1>
          <div className="mt-5 md:mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] md:text-[16px] text-[var(--color-text-muted)]">
            {data.bedrooms != null && <span>{data.bedrooms} BR</span>}
            {data.area != null && <span>{data.area} м² дом</span>}
            {data.land != null && <span>{data.land} м² земля</span>}
            {data.lease && <span>Лизхолд {data.lease} лет</span>}
          </div>
          {data.priceUsd != null && (
            <div className="mt-6 md:mt-8 flex items-baseline gap-4 flex-wrap">
              <div className="text-[26px] md:text-[40px] font-semibold text-[#111827]">{fmtUsd(data.priceUsd)}</div>
              {data.pricePerM2 != null && (
                <div className="text-[13px] md:text-[15px] text-[var(--color-text-muted)]">{fmtUsd(data.pricePerM2)} / м²</div>
              )}
            </div>
          )}
        </div>
        {/* Photo */}
        <div className="order-1 md:order-2 relative w-full h-[40vh] md:h-full overflow-hidden rounded-2xl md:rounded-3xl bg-[var(--color-search-bg)]">
          {cover ? (
            <img src={cover} alt={data.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)] text-[14px]">
              Нет фото
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PhotoSetSlide({ photos, layout, alt }: { photos: string[]; layout: 'mosaic5' | 'grid4' | 'small'; alt: string }) {
  const tile = "rounded-2xl md:rounded-3xl overflow-hidden bg-[var(--color-search-bg)]"
  if (layout === 'mosaic5') {
    return (
      <div className="absolute inset-0 px-4 md:px-12 lg:px-16 py-6 md:py-10">
        <div className="h-full grid gap-2 md:gap-3 grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2">
          <div className={`${tile} col-span-2 row-span-1 md:col-span-1 md:row-span-2`}>
            {photos[0] && <img src={photos[0]} alt={alt} className="w-full h-full object-cover" />}
          </div>
          {[1, 2, 3, 4].map(idx => photos[idx] && (
            <div key={idx} className={tile}>
              <img src={photos[idx]} alt={alt} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (layout === 'grid4') {
    return (
      <div className="absolute inset-0 px-4 md:px-12 lg:px-16 py-6 md:py-10">
        <div className="h-full grid grid-cols-2 grid-rows-2 gap-2 md:gap-3">
          {photos.slice(0, 4).map((src, idx) => (
            <div key={idx} className={tile}>
              <img src={src} alt={alt} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  // 'small' — 1-4 photos, gracefully laid out
  const count = photos.length
  const cols = count === 1 ? 'grid-cols-1' : 'grid-cols-2'
  const rows = count <= 2 ? 'grid-rows-1' : 'grid-rows-2'
  return (
    <div className="absolute inset-0 px-4 md:px-12 lg:px-16 py-6 md:py-10">
      <div className={`h-full grid gap-2 md:gap-3 ${cols} ${rows}`}>
        {photos.map((src, idx) => (
          <div key={idx} className={tile}>
            <img src={src} alt={alt} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  )
}

function FactsSlide({ data }: { data: VillaPresentationData }) {
  const items = [
    data.bedrooms != null && { Icon: BedDouble, label: 'Спальни', value: `${data.bedrooms} BR` },
    data.area != null && { Icon: Square, label: 'Дом', value: `${data.area} м²` },
    data.land != null && { Icon: Trees, label: 'Земля', value: `${data.land} м²` },
    data.yearLabel && { Icon: Calendar, label: 'Сдача', value: data.yearLabel },
    data.permit && data.permit.toLowerCase() !== 'нет' && { Icon: FileCheck2, label: 'Разрешения', value: data.permit },
    data.lease && { Icon: Lock, label: 'Лизхолд', value: `${data.lease} лет` },
    data.district && { Icon: MapPin, label: 'Район', value: data.district },
    data.pricePerM2 != null && { Icon: Square, label: 'Цена за м²', value: fmtUsd(data.pricePerM2) ?? '—' },
  ].filter(Boolean) as { Icon: typeof BedDouble; label: string; value: string }[]
  return (
    <div className="absolute inset-0 overflow-auto px-6 md:px-16 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] mb-2">Характеристики</h2>
        <p className="text-[15px] text-[var(--color-text-muted)] mb-8">Ключевые параметры объекта</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(({ Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <div className="flex items-center gap-2 mb-2 text-[var(--color-text-muted)]">
                <Icon size={16} />
                <span className="text-[12px] uppercase tracking-wide">{label}</span>
              </div>
              <div className="text-[18px] font-semibold text-[#111827]">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DescriptionSlide({ text, title }: { text: string; title: string }) {
  return (
    <div className="absolute inset-0 overflow-auto px-6 md:px-16 py-10 md:py-14">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] mb-6">О вилле</h2>
        <div className="text-[16px] md:text-[18px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
          {text}
        </div>
        <div className="mt-8 text-[13px] text-[var(--color-text-muted)]">{title}</div>
      </div>
    </div>
  )
}

function MapSlide({ data }: { data: VillaPresentationData }) {
  if (data.lat == null || data.lng == null) return null
  const src = `https://www.google.com/maps?q=${data.lat},${data.lng}&hl=ru&z=15&output=embed`
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="px-6 md:px-16 pt-10 pb-4">
        <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] mb-1">Расположение</h2>
        <div className="text-[15px] text-[var(--color-text-muted)] flex items-center gap-2 flex-wrap">
          {data.district && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {data.district}, Бали</span>}
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)]">
            Открыть в Google Maps <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
      <div className="flex-1 min-h-0 px-6 md:px-16 pb-10">
        <div className="h-full w-full overflow-hidden rounded-3xl border border-[var(--color-border)]">
          <iframe
            src={src}
            title="Карта"
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  )
}

function NearbySlide({ snap, snapTried }: { snap: Snapshot | null; snapTried: boolean }) {
  if (!snap) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)] text-[15px]">
        {snapTried ? 'Нет данных о соседних точках' : 'Загружаем места поблизости…'}
      </div>
    )
  }
  const cats = NEARBY_ORDER.filter(k => (snap.nearbyByCategory[k] ?? []).length > 0).slice(0, 8)
  return (
    <div className="absolute inset-0 flex flex-col px-6 md:px-12 lg:px-16 py-6 md:py-10">
      <div className="shrink-0 mb-4">
        <h2 className="text-[24px] md:text-[34px] font-semibold tracking-tight text-[#111827] mb-1">Что вокруг виллы</h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Топ-места поблизости по рейтингу и расстоянию
        </p>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-3 auto-rows-fr">
        {cats.map(cat => {
          const meta = NEARBY_META[cat] ?? { icon: '📌', title: cat }
          const items = [...(snap.nearbyByCategory[cat] ?? [])]
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 3)
          return (
            <div key={cat} className="rounded-xl border border-[var(--color-border)] bg-white p-3 min-h-0 flex flex-col">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[14px]">{meta.icon}</span>
                <span className="text-[12px] font-semibold text-[#111827] truncate">{meta.title}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                  {(snap.nearbyByCategory[cat] ?? []).length}
                </span>
              </div>
              <ul className="space-y-1.5 min-h-0">
                {items.map(p => (
                  <li key={p.id} className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate text-[#111827]" title={p.name ?? ''}>{p.name}</span>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                      {p.rating != null && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star size={9} className="text-[#F59E0B] fill-[#F59E0B]" />
                          <span className="font-medium text-[#111827]">{p.rating.toFixed(1)}</span>
                        </span>
                      )}
                      <span>{fmtDistance(p.distanceKm)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InvestSlide({ snap, priceUsd }: { snap: Snapshot | null; priceUsd: number | null }) {
  if (!snap?.scenarios) return null
  const sc = snap.scenarios
  const cards: { key: 'bad' | 'median' | 'good'; title: string; tone: string; tint: string }[] = [
    { key: 'bad',    title: 'Плохой',     tone: 'border-[#FECACA] bg-[#FEF2F2]', tint: 'text-[#B91C1C]' },
    { key: 'median', title: 'Нормальный', tone: 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]', tint: 'text-[var(--color-primary-pressed)]' },
    { key: 'good',   title: 'Хороший',    tone: 'border-[#BBF7D0] bg-[#F0FDF4]', tint: 'text-[#15803D]' },
  ]
  return (
    <div className="absolute inset-0 overflow-auto px-6 md:px-16 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] mb-2">Инвестиционный потенциал</h2>
        <p className="text-[15px] text-[var(--color-text-muted)] mb-8">
          Три сценария аренды по матчингу с {snap.competitors.length} {pluralRu(snap.competitors.length, ['конкурентом', 'конкурентами', 'конкурентами'])} в зоне
          {snap.zone.title ? ` ${snap.zone.title}` : ''}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map(card => {
            const e = sc[card.key]
            return (
              <div key={card.key} className={`rounded-2xl border p-5 ${card.tone}`}>
                <div className={`flex items-baseline justify-between mb-3 text-[13px] uppercase tracking-wide font-semibold ${card.tint}`}>
                  <span>{card.title}</span>
                  <span className="text-[12px] font-normal opacity-80">ADR {fmtUsd(e.adr)} · {Math.round(e.occupancy * 100)}%</span>
                </div>
                <div className="text-[26px] md:text-[32px] font-semibold text-[#111827]">{fmtUsdShort(e.noi)}</div>
                <div className="text-[13px] text-[var(--color-text-muted)] mb-4">/ год NOI</div>
                <dl className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">Окупаемость</dt><dd className="font-medium text-[#111827]">{fmtYears(e.payback)}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">Cap rate</dt><dd className="font-medium text-[#111827]">{fmtPct(e.capRate)}</dd></div>
                </dl>
              </div>
            )
          })}
        </div>
        {priceUsd != null && (
          <div className="mt-6 text-[13px] text-[var(--color-text-muted)]">
            Расчёт от цены {fmtUsd(priceUsd)} с учётом комиссий, OPEX и налога 10%.
          </div>
        )}
      </div>
    </div>
  )
}

function DownloadModal({ data, snap, onClose }: { data: VillaPresentationData; snap: Snapshot | null; onClose: () => void }) {
  const [mode, setMode] = useState<'choose' | 'agent'>('choose')
  const [name, setName] = useState('')
  const [telegram, setTelegram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmedName = name.trim()
  const trimmedTg = telegram.trim()
  const trimmedWa = whatsapp.trim()
  const canSubmitAgent = trimmedName.length > 0 && (trimmedTg.length > 0 || trimmedWa.length > 0) && !busy

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const downloadSimple = async () => {
    setBusy(true)
    setError(null)
    try {
      const { downloadVillaPdf } = await import('./VillaPresentationPdf')
      await downloadVillaPdf(data, snap, null)
      onClose()
    } catch (e) {
      console.error(e)
      setError('Не получилось собрать PDF. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  const submitAgent = async () => {
    if (!canSubmitAgent) return
    setBusy(true)
    setError(null)
    try {
      const { downloadVillaPdf } = await import('./VillaPresentationPdf')
      await downloadVillaPdf(data, snap, { name: trimmedName, telegram: trimmedTg, whatsapp: trimmedWa })
      onClose()
    } catch (e) {
      console.error(e)
      setError('Не получилось собрать PDF. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4"
      onClick={() => { if (!busy) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 id="download-modal-title" className="text-[20px] md:text-[22px] font-semibold tracking-tight text-[#111827]">
            Скачать презентацию
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-[#111827] disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        {mode === 'choose' ? (
          <>
            <p className="text-[13px] text-[var(--color-text-muted)] mb-5">
              Выберите вариант — без контактов или со своими как агента.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={downloadSimple}
                disabled={busy}
                className="w-full text-left rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] bg-white px-4 py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[var(--color-search-bg)] flex items-center justify-center">
                    {busy ? <Loader2 size={18} className="animate-spin text-[var(--color-text-muted)]" /> : <Download size={18} className="text-[#111827]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#111827]">Скачать</div>
                    <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                      На последней странице — ссылка на страницу виллы
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('agent')}
                disabled={busy}
                className="w-full text-left rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] bg-white px-4 py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center">
                    <UserRound size={18} className="text-[var(--color-primary-pressed)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#111827]">Скачать для агента</div>
                    <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                      На последней странице — ваши имя, Telegram и WhatsApp
                    </div>
                  </div>
                </div>
              </button>
            </div>
            {error && <p className="mt-3 text-[13px] text-[#B91C1C]">{error}</p>}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMode('choose')}
              disabled={busy}
              className="text-[12px] text-[var(--color-text-muted)] hover:text-[#111827] inline-flex items-center gap-1 mb-3 disabled:opacity-50"
            >
              <ChevronLeft size={13} /> К выбору варианта
            </button>
            <p className="text-[13px] text-[var(--color-text-muted)] mb-5">
              Ваши контакты попадут на последнюю страницу PDF — клиент сможет связаться напрямую.
            </p>
            <form
              onSubmit={e => { e.preventDefault(); submitAgent() }}
              className="space-y-3"
            >
              <Field id="dl-name" label="Имя" value={name} onChange={setName} placeholder="Андрей" autoFocus required />
              <Field id="dl-telegram" label="Telegram" value={telegram} onChange={setTelegram} placeholder="@username" />
              <Field id="dl-whatsapp" label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+62 812 345 67 89" inputMode="tel" />
              {!canSubmitAgent && trimmedName.length > 0 && trimmedTg.length === 0 && trimmedWa.length === 0 && !busy && (
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  Укажите Telegram или WhatsApp — хотя бы один контакт.
                </p>
              )}
              {error && <p className="text-[13px] text-[#B91C1C]">{error}</p>}
              <button
                type="submit"
                disabled={!canSubmitAgent}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-medium px-5 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Собираем PDF…
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Скачать PDF
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  id, label, value, onChange, placeholder, autoFocus, required, inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  required?: boolean
  inputMode?: 'text' | 'tel' | 'email' | 'url'
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[12px] font-medium text-[var(--color-text-muted)] mb-1.5">
        {label} {required && <span className="text-[#B91C1C]">*</span>}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        inputMode={inputMode}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-[15px] text-[#111827] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
      />
    </label>
  )
}
