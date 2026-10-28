'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'
import { X, ChevronLeft, ChevronRight, Play, Star, MapPin, BedDouble, Square, Trees, Calendar, FileCheck2, Lock, ArrowUpRight, Download, Loader2, UserRound, FileText, Check, Coffee, Image as ImageIcon, LayoutGrid, ListChecks } from 'lucide-react'
import type { Snapshot as BaseSnapshot } from '@/components/InvestmentWidget/types'
import type { YieldFacts } from '@/lib/listing-verdict'

// Снимок из /investment-snapshot плюс доходность страницы объекта.
type Snapshot = BaseSnapshot & { yieldFacts?: YieldFacts | null }
import { fmtMoney, fmtPct, fmtYears } from '@/components/InvestmentWidget/utils'
import { formatPrice } from '@/lib/currency'
import { useCurrency } from '@/components/CurrencyContext'
import type { Lang } from '@/lib/i18n'
import { permitLabel, placeVisible, presentationCopy, presentationDistance } from './presentation-copy'
import { PDF_BLOCKS, type PdfBlock } from '@/lib/pdf-blocks'
import { calcToQuery, readCalc } from '@/lib/calc-settings'
import { trackEvent } from '@/lib/analytics'

export type VillaPresentationData = {
  villaId: string
  slug: string
  kind?: 'villa' | 'apartment'
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
  // Язык страницы, с которой открыли презентацию: по нему слайды и PDF.
  lang?: Lang
}

const NEARBY_ICONS: Record<string, string> = {
  beach: '🏖', beachclub: '🍹', international_school: '🎓', school: '🏫', preschool: '🧸',
  wellness: '🧘', restaurant: '🍴', cafe: '☕', supermarket: '🛒', pharmacy: '💊',
  hospital: '🏥', nightlife: '🌙', attraction: '📍',
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

export function VillaPresentationButton({
  variant = 'primary',
  lang = 'ru',
  ...props
}: VillaPresentationData & { variant?: 'primary' | 'outline'; lang?: Lang }) {
  const [open, setOpen] = useState(false)
  const t = lang === 'ru'
    ? { outline: 'Скачать презентацию PDF',  primary: 'Презентация',  aria: 'Открыть презентацию виллы' }
    : { outline: 'PDF presentation', primary: 'Presentation', aria: 'Open villa presentation' }
  // 'outline' matches the new PriceCtaCard CTA row — same 54px height
  // as the green Buy button, white background with a hairline border so
  // the two CTAs read as siblings rather than mismatched controls.
  const styles = variant === 'outline'
    ? 'w-full md:w-auto min-h-[54px] py-2 px-6 rounded-[10px] bg-white border border-[var(--color-border)] hover:border-[var(--color-text-muted)] text-[#1A1F1C] text-[15px] md:text-[16px] font-semibold text-center leading-tight transition-colors'
    : 'rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[14px] font-medium px-4 py-2.5 shadow-sm transition-colors'
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 ${styles}`}
        aria-label={t.aria}
      >
        {variant === 'outline'
          ? <FileText size={18} strokeWidth={1.6} />
          : <Play size={15} fill="currentColor" />}
        {variant === 'outline' ? t.outline : t.primary}
      </button>
      {/* «Скачать PDF» сразу открывает окно выбора блоков, без слайдов. */}
      {open && (variant === 'outline'
        ? <DirectDownload data={{ ...props, lang }} onClose={() => setOpen(false)} />
        : <VillaPresentation data={{ ...props, lang }} onClose={() => setOpen(false)} />)}
    </>
  )
}

function useSnapshot(villaId: string, kind: VillaPresentationData['kind']) {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [snapTried, setSnapTried] = useState(false)
  useEffect(() => {
    let cancelled = false
    const apiBase = kind === 'apartment' ? '/api/apartament' : '/api/villa'
    fetch(`${apiBase}/${villaId}/investment-snapshot`)
      .then(r => (r.ok ? r.json() : null))
      .then(s => { if (!cancelled) { setSnap(s); setSnapTried(true) } })
      .catch(() => { if (!cancelled) setSnapTried(true) })
    return () => { cancelled = true }
  }, [villaId, kind])
  return { snap, snapTried }
}

function DirectDownload({ data, onClose }: { data: VillaPresentationData; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  return <DownloadModal data={data} onClose={onClose} />
}

function VillaPresentation({ data, onClose }: { data: VillaPresentationData; onClose: () => void }) {
  const { snap, snapTried } = useSnapshot(data.villaId, data.kind)
  const [i, setI] = useState(0)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const touchX = useRef<number | null>(null)
  const c = presentationCopy(data.lang)

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
    if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev() }
    touchX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={c.dialog}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between gap-4 px-4 md:px-8 py-3 text-[var(--color-text)]">
        <div className="min-w-0 flex items-center gap-3">
          {/* shrink-0 + nowrap: иначе на телефоне длинный заголовок рядом
              сжимал счётчик в столбик «1 / 8» по строке на символ. */}
          <div className="shrink-0 whitespace-nowrap tabular-nums text-[12px] uppercase tracking-wider text-[var(--color-text-muted)]">
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
            aria-label={c.downloadAria}
          >
            <Download size={15} />
            <span className="hidden sm:inline">{c.download}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 text-[var(--color-text)] transition-colors"
            aria-label={c.closeAria}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {downloadOpen && (
        <DownloadModal
          data={data}
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
              aria-label={c.slide(idx + 1)}
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
          aria-label={c.prevSlide}
          disabled={safeI === 0}
          className="hidden md:flex absolute left-0 top-0 bottom-0 w-[12%] items-center justify-start pl-3 group focus:outline-none disabled:cursor-default"
        >
          <span className={`opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/5 text-[var(--color-text)] ${safeI === 0 ? 'invisible' : ''}`}>
            <ChevronLeft size={22} />
          </span>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label={c.nextSlide}
          disabled={safeI === total - 1}
          className="hidden md:flex absolute right-0 top-0 bottom-0 w-[12%] items-center justify-end pr-3 group focus:outline-none disabled:cursor-default"
        >
          <span className={`opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/5 text-[var(--color-text)] ${safeI === total - 1 ? 'invisible' : ''}`}>
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
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/5 text-[var(--color-text)] disabled:opacity-30"
          aria-label={c.back}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={next}
          disabled={safeI === total - 1}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] text-white disabled:opacity-30"
          aria-label={c.next}
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
    case 'description': return <DescriptionSlide text={slide.text} data={data} />
    case 'map':         return <MapSlide data={data} />
    case 'nearby':      return <NearbySlide snap={snap} snapTried={snapTried} data={data} />
    case 'invest':      return <InvestSlide snap={snap} data={data} />
  }
}

function CoverSlide({ data }: { data: VillaPresentationData }) {
  const c = presentationCopy(data.lang)
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const cover = data.photos[0]
  return (
    <div className="absolute inset-0 px-6 md:px-12 lg:px-16 py-8 md:py-12">
      <div className="h-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 md:gap-10 items-center">
        {/* Text */}
        <div className="order-2 md:order-1 flex flex-col">
          {data.district && (
            <div className="inline-flex items-center gap-1.5 text-[12px] md:text-[13px] uppercase tracking-wider text-[var(--color-primary)] mb-3 font-medium">
              <MapPin size={13} /> {data.district}, {c.bali}
            </div>
          )}
          <h1 className="text-[26px] md:text-[44px] lg:text-[56px] font-semibold tracking-tight leading-[1.05] text-[var(--color-text)]">
            {data.title}
          </h1>
          <div className="mt-5 md:mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] md:text-[16px] text-[var(--color-text-muted)]">
            {data.bedrooms != null && <span>{data.bedrooms} BR</span>}
            {data.area != null && <span>{data.area} {c.sqm} {c.house}</span>}
            {data.land != null && <span>{data.land} {c.sqm} {c.land}</span>}
            {data.lease && <span>{c.leaseYears(data.lease)}</span>}
          </div>
          {data.priceUsd != null && (
            <div className="mt-6 md:mt-8 flex items-baseline gap-4 flex-wrap">
              <div className="text-[26px] md:text-[40px] font-semibold text-[var(--color-text)]">{fmtUsd(data.priceUsd)}</div>
              {data.pricePerM2 != null && (
                <div className="text-[13px] md:text-[15px] text-[var(--color-text-muted)]">{fmtUsd(data.pricePerM2)} {c.perSqm}</div>
              )}
            </div>
          )}
        </div>
        {/* Photo */}
        <div className="order-1 md:order-2 relative w-full h-[40vh] md:h-full overflow-hidden rounded-2xl md:rounded-3xl bg-[var(--color-search-bg)]">
          {cover ? (
            <NextImage src={cover} alt={data.title} fill sizes="(max-width: 768px) 100vw, 50vw" priority className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)] text-[14px]">
              {c.noPhoto}
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
          <div className={`relative ${tile} col-span-2 row-span-1 md:col-span-1 md:row-span-2`}>
            {photos[0] && <NextImage src={photos[0]} alt={alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />}
          </div>
          {[1, 2, 3, 4].map(idx => photos[idx] && (
            <div key={idx} className={`relative ${tile}`}>
              <NextImage src={photos[idx]} alt={alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
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
            <div key={idx} className={`relative ${tile}`}>
              <NextImage src={src} alt={alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
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
          <div key={idx} className={`relative ${tile}`}>
            <NextImage src={src} alt={alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  )
}

function FactsSlide({ data }: { data: VillaPresentationData }) {
  const c = presentationCopy(data.lang)
  const permit = permitLabel(data.permit, data.lang)
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const items = [
    data.bedrooms != null && { Icon: BedDouble, label: c.bedrooms, value: `${data.bedrooms} BR` },
    data.area != null && { Icon: Square, label: c.houseLabel, value: `${data.area} ${c.sqm}` },
    data.land != null && { Icon: Trees, label: c.landLabel, value: `${data.land} ${c.sqm}` },
    data.yearLabel && { Icon: Calendar, label: c.completion, value: data.yearLabel },
    permit && { Icon: FileCheck2, label: c.permits, value: permit },
    data.lease && { Icon: Lock, label: c.leasehold, value: c.years(data.lease) },
    data.district && { Icon: MapPin, label: c.district, value: data.district },
    data.pricePerM2 != null && { Icon: Square, label: c.pricePerSqm, value: fmtUsd(data.pricePerM2) ?? '—' },
  ].filter(Boolean) as { Icon: typeof BedDouble; label: string; value: string }[]
  return (
    <div className="absolute inset-0 overflow-auto px-6 md:px-16 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[var(--color-text)] mb-2">{c.factsTitle}</h2>
        <p className="text-[15px] text-[var(--color-text-muted)] mb-8">{c.factsSub}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(({ Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <div className="flex items-center gap-2 mb-2 text-[var(--color-text-muted)]">
                <Icon size={16} />
                <span className="text-[12px] uppercase tracking-wide">{label}</span>
              </div>
              <div className="text-[18px] font-semibold text-[var(--color-text)]">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DescriptionSlide({ text, data }: { text: string; data: VillaPresentationData }) {
  const c = presentationCopy(data.lang)
  return (
    <div className="absolute inset-0 overflow-auto px-6 md:px-16 py-10 md:py-14">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[var(--color-text)] mb-6">{c.about(data.kind)}</h2>
        <div className="text-[16px] md:text-[18px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
          {text}
        </div>
        <div className="mt-8 text-[13px] text-[var(--color-text-muted)]">{data.title}</div>
      </div>
    </div>
  )
}

function MapSlide({ data }: { data: VillaPresentationData }) {
  const c = presentationCopy(data.lang)
  if (data.lat == null || data.lng == null) return null
  const src = `https://www.google.com/maps?q=${data.lat},${data.lng}&hl=${data.lang === 'ru' ? 'ru' : 'en'}&z=15&output=embed`
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="px-6 md:px-16 pt-10 pb-4">
        <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[var(--color-text)] mb-1">{c.location}</h2>
        <div className="text-[15px] text-[var(--color-text-muted)] flex items-center gap-2 flex-wrap">
          {data.district && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {data.district}, {c.bali}</span>}
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)]">
            {c.openMaps} <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
      <div className="flex-1 min-h-0 px-6 md:px-16 pb-10">
        <div className="h-full w-full overflow-hidden rounded-3xl border border-[var(--color-border)]">
          <iframe
            src={src}
            title={c.map}
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  )
}

function NearbySlide({ snap, snapTried, data }: { snap: Snapshot | null; snapTried: boolean; data: VillaPresentationData }) {
  const c = presentationCopy(data.lang)
  if (!snap) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)] text-[15px]">
        {snapTried ? c.noNearby : c.loadingNearby}
      </div>
    )
  }
  const visibleIn = (k: string) => (snap.nearbyByCategory[k] ?? []).filter(p => placeVisible(p.name, data.lang))
  const cats = NEARBY_ORDER.filter(k => visibleIn(k).length > 0).slice(0, 8)
  return (
    <div className="absolute inset-0 flex flex-col px-6 md:px-12 lg:px-16 py-6 md:py-10">
      <div className="shrink-0 mb-4">
        <h2 className="text-[24px] md:text-[34px] font-semibold tracking-tight text-[var(--color-text)] mb-1">{c.nearbyTitle(data.kind)}</h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          {c.nearbySub}
        </p>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-3 auto-rows-fr">
        {cats.map(cat => {
          const meta = { icon: NEARBY_ICONS[cat] ?? '📌', title: c.nearby[cat] ?? cat }
          const items = [...visibleIn(cat)]
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 3)
          return (
            <div key={cat} className="rounded-xl border border-[var(--color-border)] bg-white p-3 min-h-0 flex flex-col">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[14px]">{meta.icon}</span>
                <span className="text-[12px] font-semibold text-[var(--color-text)] truncate">{meta.title}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                  {visibleIn(cat).length}
                </span>
              </div>
              <ul className="space-y-1.5 min-h-0">
                {items.map(p => (
                  <li key={p.id} className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate text-[var(--color-text)]" title={p.name ?? ''}>{p.name}</span>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                      {p.rating != null && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star size={9} className="text-[#F59E0B] fill-[#F59E0B]" />
                          <span className="font-medium text-[var(--color-text)]">{p.rating.toFixed(1)}</span>
                        </span>
                      )}
                      <span>{presentationDistance(p.distanceKm, c)}</span>
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

function InvestSlide({ snap, data }: { snap: Snapshot | null; data: VillaPresentationData }) {
  const c = presentationCopy(data.lang)
  const priceUsd = data.priceUsd
  const { currency } = useCurrency()
  const fmtUsd = (n: number | null | undefined) => fmtMoney(n, currency)
  const fmtUsdShort = (n: number | null | undefined) => (n == null ? '—' : formatPrice(n, currency, data.lang ?? 'ru'))
  // Посуточная доходность — ровно та, что на странице объекта (computeYieldFacts):
  // три сценария считались для нерезидента без своей загрузки комплекса и
  // давали другую цифру, чем страница.
  const yf = snap?.yieldFacts
  if (snap && yf && yf.mode === 'daily') {
    const occ = snap.ownBooking?.occupancy ?? snap.region.occupancyByScenario.median
    return (
      <div className="absolute inset-0 overflow-auto px-6 md:px-16 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[var(--color-text)] mb-2">{c.investTitle}</h2>
          <p className="text-[15px] text-[var(--color-text-muted)] mb-8">{c.ourCalc}</p>
          <div className="rounded-2xl border p-5 border-[var(--color-primary)] bg-[var(--color-primary-soft)]">
            <div className="text-[13px] text-[var(--color-text-muted)] mb-3">{fmtUsd(yf.rateUsd)} {c.perNight} · {c.occShort} {Math.round(occ * 100)}%</div>
            <div className="text-[26px] md:text-[32px] font-semibold text-[var(--color-text)]">{fmtUsdShort(yf.noiBeforeTaxUsd)}</div>
            <div className="text-[13px] text-[var(--color-text-muted)] mb-4">{c.perYearBeforeTax}</div>
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">{c.yBeforeTax}</dt><dd className="font-medium text-[var(--color-text)]">{fmtPct(yf.pct.beforeTax)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">{c.yResident}</dt><dd className="font-medium text-[var(--color-text)]">{fmtPct(yf.pct.resident)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">{c.yNonResident}</dt><dd className="font-medium text-[var(--color-text)]">{fmtPct(yf.pct.nonResident)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">{c.payback}</dt><dd className="font-medium text-[var(--color-text)]">{fmtYears(yf.paybackYears, data.lang)}</dd></div>
            </dl>
          </div>
          {priceUsd != null && (
            <div className="mt-6 text-[13px] text-[var(--color-text-muted)]">{c.calcNote(fmtUsd(priceUsd))}</div>
          )}
        </div>
      </div>
    )
  }
  if (!snap?.scenarios) return null
  const sc = snap.scenarios
  const cards: { key: 'bad' | 'median' | 'good'; title: string; tone: string; tint: string }[] = [
    { key: 'bad',    title: c.scenario.bad, tone: 'border-[#FECACA] bg-[#FEF2F2]', tint: 'text-[#B91C1C]' },
    { key: 'median', title: c.scenario.median, tone: 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]', tint: 'text-[var(--color-primary-pressed)]' },
    { key: 'good',   title: c.scenario.good, tone: 'border-[#BBF7D0] bg-[#F0FDF4]', tint: 'text-[#15803D]' },
  ]
  return (
    <div className="absolute inset-0 overflow-auto px-6 md:px-16 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[var(--color-text)] mb-2">{c.investTitle}</h2>
        <p className="text-[15px] text-[var(--color-text-muted)] mb-8">
          {c.investSub(snap.competitors.length, snap.zone.applied)}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map(card => {
            const e = sc[card.key]
            return (
              <div key={card.key} className={`rounded-2xl border p-5 ${card.tone}`}>
                <div className={`flex items-baseline justify-between mb-3 text-[13px] uppercase tracking-wide font-semibold ${card.tint}`}>
                  <span>{card.title}</span>
                  <span className="text-[12px] font-normal opacity-80">{fmtUsd(e.adr)} {c.perNight} · {Math.round(e.occupancy * 100)}%</span>
                </div>
                <div className="text-[26px] md:text-[32px] font-semibold text-[var(--color-text)]">{fmtUsdShort(e.noi)}</div>
                <div className="text-[13px] text-[var(--color-text-muted)] mb-4">{c.perYearNet}</div>
                <dl className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">{c.payback}</dt><dd className="font-medium text-[var(--color-text)]">{fmtYears(e.payback, data.lang)}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">{c.yieldPerYear}</dt><dd className="font-medium text-[var(--color-text)]">{fmtPct(e.capRate)}</dd></div>
                </dl>
              </div>
            )
          })}
        </div>
        {priceUsd != null && (
          <div className="mt-6 text-[13px] text-[var(--color-text-muted)]">
            {c.calcNote(fmtUsd(priceUsd))}
          </div>
        )}
      </div>
    </div>
  )
}

// Блоки PDF в порядке страниц. Обложка и последняя страница — всегда.
// Блоки печатной презентации (components/pdf/PdfDocument.tsx), в порядке листов.
type PickBlock = PdfBlock
const PICK_ORDER: PickBlock[] = PDF_BLOCKS
const PRESETS: { id: 'short' | 'invest' | 'life' | 'all'; blocks: PickBlock[] | null }[] = [
  { id: 'short', blocks: ['verdict', 'photos', 'facts'] },
  { id: 'invest', blocks: ['verdict', 'photos', 'safety', 'daily', 'monthly', 'sale', 'calc'] },
  { id: 'life', blocks: ['photos', 'safety', 'near', 'living', 'heat'] },
  { id: 'all', blocks: null },
]
const BLOCK_ICONS = {
  cover: ImageIcon, verdict: ListChecks, photos: LayoutGrid, facts: ListChecks, about: FileText, safety: FileCheck2,
  near: MapPin, living: Coffee, heat: MapPin, daily: BedDouble, monthly: Calendar, sale: Square, calc: FileText, last: UserRound,
}
// Сколько листов даёт блок: «дорога и погода» — два.
const BLOCK_PAGES: Partial<Record<PickBlock, number>> = { living: 2 }
const AGENT_KEY = 'bx_pdf_agent'

// Сколько страниц фото — так же, как их раскладывает VillaPresentationPdf.
function photoPages(photos: string[]): number {
  const pool = photos.slice(1, 12)
  if (pool.length >= 5) return pool.length >= 6 ? 2 : 1
  return pool.length > 0 ? 1 : 0
}

function DownloadModal({ data, onClose }: { data: VillaPresentationData; onClose: () => void }) {
  const c = presentationCopy(data.lang)
  // Валюта, которую человек выбрал на сайте, — в цены презентации.
  const { currency } = useCurrency()
  // На телефоне по умолчанию вертикальный PDF — его удобнее листать в мессенджере.
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'portrait' : 'landscape')
  // Блоки, для которых у объекта есть данные. Пустые не предлагаем.
  // Чего у объекта точно нет — не предлагаем; остальное печатная страница
  // пропустит сама, если данных не окажется.
  const hasMap = data.lat != null && data.lng != null
  const available = PICK_ORDER.filter(b => {
    if (b === 'photos') return photoPages(data.photos) > 0
    if (b === 'about') return !!data.seoText
    if (b === 'near' || b === 'heat') return hasMap
    return true
  })
  const [picked, setPicked] = useState<PickBlock[]>(() => presetBlocks(PRESETS[1]))
  const [withAgent, setWithAgent] = useState(false)
  const [name, setName] = useState('')
  const [telegram, setTelegram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmedName = name.trim()
  const trimmedTg = telegram.trim()
  const trimmedWa = whatsapp.trim()
  const agentOk = trimmedName.length > 0 && (trimmedTg.length > 0 || trimmedWa.length > 0)
  const canDownload = !busy && (!withAgent || agentOk)

  // Контакты: что человек уже правил здесь — из этого браузера, иначе из
  // аккаунта (имя, Telegram, телефон). Поменять можно прямо в окне.
  useEffect(() => {
    let saved: { on?: boolean; name?: string; telegram?: string; whatsapp?: string } | null = null
    try { saved = JSON.parse(localStorage.getItem(AGENT_KEY) ?? 'null') } catch {}
    if (saved && typeof saved === 'object' && (saved.name || saved.telegram || saved.whatsapp)) {
      setName(saved.name ?? ''); setTelegram(saved.telegram ?? ''); setWhatsapp(saved.whatsapp ?? '')
      setWithAgent(!!saved.on)
      return
    }
    let alive = true
    fetch('/api/account/contacts', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((j: { contacts?: { name: string; telegram: string; whatsapp: string } | null } | null) => {
        const a = j?.contacts
        if (!alive || !a) return
        setName(a.name); setTelegram(a.telegram); setWhatsapp(a.whatsapp)
        setWithAgent(!!a.name && !!(a.telegram || a.whatsapp))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  function presetBlocks(p: (typeof PRESETS)[number]) { return (p.blocks ?? available).filter(b => available.includes(b)) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const toggle = (b: PickBlock) =>
    setPicked(prev => prev.includes(b) ? prev.filter(x => x !== b) : PICK_ORDER.filter(x => x === b || prev.includes(x)))
  const sameSet = (a: PickBlock[], b: PickBlock[]) => a.length === b.length && a.every(x => b.includes(x))
  const pageCount = 2 + picked.reduce((n, b) => n + (BLOCK_PAGES[b] ?? 1), 0)
  const presetLabel = { short: c.presetShort, invest: c.presetInvest, life: c.presetLife, all: c.presetAll }

  const download = async () => {
    if (!canDownload) return
    setBusy(true)
    setError(null)
    try {
      try {
        localStorage.setItem(AGENT_KEY, JSON.stringify({ on: withAgent, name: trimmedName, telegram: trimmedTg, whatsapp: trimmedWa }))
      } catch {}
      // Печатная страница собирает презентацию из тех же данных, что страница
      // объекта; сервер (app/api/pdf) превращает её в файл — без окна печати.
      const q = new URLSearchParams({ b: picked.join(','), lang: data.lang ?? 'ru', o: orientation === 'portrait' ? 'p' : 'l' })
      if (withAgent) {
        q.set('n', trimmedName)
        if (trimmedTg) q.set('t', trimmedTg)
        if (trimmedWa) q.set('w', trimmedWa)
      }
      const calc = readCalc(data.villaId)
      if (calc) for (const [k, v] of Object.entries(calcToQuery(calc))) q.set(k, v)
      const section = data.kind === 'apartment' ? '/ru/apartamenty/o/' : '/ru/villy/o/'
      const target = `${section}${data.slug}/pdf?${q.toString()}`
      const r = await fetch(`/api/pdf?cur=${currency}&u=${encodeURIComponent(target)}`)
      if (!r.ok) throw new Error(`pdf ${r.status}`)
      const blob = await r.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = `${data.kind === 'apartment' ? 'apartament' : 'villa'}-${data.slug}${orientation === 'portrait' ? '-phone' : ''}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 60_000)
      trackEvent('presentation_open', { page_path: window.location.pathname })
      fetch('/api/track/presentation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'object', objectKind: data.kind ?? 'villa', objectId: data.villaId, slug: data.slug, title: data.title,
          agent: withAgent ? { name: trimmedName, telegram: trimmedTg, whatsapp: trimmedWa } : null,
          orientation, hasAgent: withAgent, lang: data.lang ?? 'ru', blocks: picked,
        }),
        keepalive: true,
      }).catch(() => {})
      onClose()
    } catch (e) {
      console.error(e)
      setError(c.pdfError)
    } finally {
      setBusy(false)
    }
  }

  const rows: { id: 'cover' | PickBlock | 'last'; locked: boolean; on: boolean }[] = [
    { id: 'cover', locked: true, on: true },
    ...available.map(b => ({ id: b, locked: false, on: picked.includes(b) })),
    { id: 'last', locked: true, on: true },
  ]
  const thumbFor = (id: string) => id === 'cover' ? data.photos[0] : id === 'photos' ? (data.photos[1] ?? data.photos[0]) : null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 md:px-4"
      onClick={() => { if (!busy) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
    >
      <div
        className="w-full md:max-w-[960px] max-h-[88dvh] flex flex-col rounded-t-2xl md:rounded-xl bg-white shadow-[0_1px_2px_rgb(0_0_0/.04),0_12px_32px_rgb(0_0_0/.12)]"
        onClick={e => e.stopPropagation()}
      >
        <div aria-hidden="true" className="md:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--color-neutral-300)]" />

        <div className="px-4 md:px-8 pt-3 md:pt-6 pb-3 md:pb-6">
          <div className="flex items-center gap-3">
            <h3 id="download-modal-title" className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
              {c.pickTitle}
            </h3>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[13px] font-semibold text-[var(--color-primary-pressed)]">Pro</span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-lg hover:bg-black/5 text-[var(--color-text-muted)] disabled:opacity-50"
              aria-label={c.close}
            >
              <X size={20} />
            </button>
          </div>
          <p className="mt-1 text-[14px] text-[var(--color-text-muted)]">
            <span className="hidden md:inline">{c.pickSub}</span>
            <span className="md:hidden">{c.pickSubMobile}</span>
          </p>
          <div role="radiogroup" aria-label={c.presetsAria} className="hidden md:flex flex-wrap gap-2 mt-3">
            {PRESETS.map(p => {
              const blocks = presetBlocks(p)
              // Подсвечиваем только первый совпавший набор: у объекта без
              // части данных «Для жизни» и «Всё» могут совпасть.
              const active = PRESETS.find(q => sameSet(picked, presetBlocks(q)))?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPicked(blocks)}
                  disabled={busy}
                  className={`min-h-10 rounded-full border px-4 text-[14px] transition-colors ${
                    active
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-pressed)]'
                      : 'border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  {presetLabel[p.id]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border-t border-[var(--color-border)] md:bg-[var(--color-surface-alt)] px-4 md:px-8 md:py-6">
          {/* Компьютер: плитки-страницы */}
          <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-3">
            {rows.map(r => {
              const [title] = c.blk[r.id]
              const Icon = BLOCK_ICONS[r.id]
              const thumb = thumbFor(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={r.on}
                  disabled={r.locked || busy}
                  onClick={() => { if (!r.locked) toggle(r.id as PickBlock) }}
                  className={`flex flex-col gap-3 rounded-xl border-2 bg-white p-3 text-left transition-[border-color,opacity] duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                    r.on ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)] opacity-60 hover:opacity-100'
                  } ${r.locked ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="relative block aspect-[16/9] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                    {thumb
                      ? <NextImage src={thumb} alt="" fill sizes="200px" className="object-cover" />
                      : <span className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]"><Icon size={24} strokeWidth={1.6} /></span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckDot on={r.on} locked={r.locked} round />
                    <span className="text-[14px] font-semibold text-[var(--color-text)]">{title}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Телефон: список с переключателями */}
          <div className="md:hidden">
            {rows.map(r => {
              const [title, sub] = c.blk[r.id]
              return (
                <label key={r.id} className={`flex items-center gap-3 min-h-14 py-2 border-b border-[var(--color-neutral-100)] ${r.locked ? '' : 'cursor-pointer'}`}>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-[var(--color-text)]">{title}</span>
                    <span className="block text-[13px] text-[var(--color-text-muted)]">{r.locked ? c.always : sub}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="peer sr-only"
                    checked={r.on}
                    disabled={r.locked || busy}
                    onChange={() => toggle(r.id as PickBlock)}
                  />
                  <span
                    aria-hidden="true"
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-[120ms] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-primary)] ${
                      r.on ? (r.locked ? 'bg-[var(--color-neutral-400)]' : 'bg-[var(--color-primary)]') : 'bg-[var(--color-neutral-300)]'
                    }`}
                  >
                    <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/.2)] transition-transform duration-[120ms] ${r.on ? 'translate-x-[23px]' : 'translate-x-[3px]'}`} />
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] px-4 md:px-8 pt-3 md:pt-4 pb-6 md:pb-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-[14px] text-[var(--color-text)] cursor-pointer min-h-11">
            <input
              type="checkbox"
              checked={withAgent}
              onChange={e => setWithAgent(e.target.checked)}
              disabled={busy}
              className="h-[18px] w-[18px] accent-[var(--color-primary)]"
            />
            {c.withContacts}
          </label>
          {withAgent && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field id="dl-name" label={c.name} value={name} onChange={setName} placeholder={c.namePlaceholder} required />
              <Field id="dl-telegram" label="Telegram" value={telegram} onChange={setTelegram} placeholder="@username" />
              <Field id="dl-whatsapp" label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+62 812 345 67 89" inputMode="tel" />
            </div>
          )}
          {withAgent && trimmedName.length > 0 && !trimmedTg && !trimmedWa && (
            <p className="text-[13px] text-[var(--color-text-muted)]">{c.needContact}</p>
          )}
          {error && <p className="text-[13px] text-[#B91C1C]">{error}</p>}
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div role="radiogroup" aria-label={c.formatAria} className="grid grid-cols-2 rounded-lg bg-[var(--color-neutral-100)] p-1">
              {([
                { v: 'landscape', label: c.landscape },
                { v: 'portrait', label: c.portrait },
              ] as const).map(opt => {
                const isActive = orientation === opt.v
                return (
                  <button key={opt.v} type="button" role="radio" aria-checked={isActive} onClick={() => setOrientation(opt.v)} disabled={busy}
                    className={`min-h-10 rounded-md px-4 text-[14px] transition-colors ${isActive ? 'bg-white font-semibold text-[var(--color-text)] shadow-[0_1px_2px_rgb(0_0_0/.06)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} disabled:opacity-50`}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <div className="hidden md:block flex-1 text-[14px] text-[var(--color-text-muted)]">
              {orientation === 'landscape' && c.summary(pageCount, false, withAgent)}
            </div>
            <button
              type="button"
              onClick={download}
              disabled={!canDownload}
              className="inline-flex min-h-[52px] md:min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-pressed)] px-6 text-[16px] md:text-[15px] font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy
                ? <><Loader2 size={18} className="animate-spin" />{c.building}</>
                : <><Download size={18} />{c.downloadPdf}{orientation === 'landscape' && <span className="md:hidden"> · {c.pages(pageCount)}</span>}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckDot({ on, locked, round }: { on: boolean; locked: boolean; round?: boolean }) {
  const shape = round ? 'rounded-full' : 'rounded-md'
  return on ? (
    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center ${shape} ${locked ? 'bg-[var(--color-neutral-400)]' : 'bg-[var(--color-primary)]'}`}>
      <Check size={12} strokeWidth={3} className="text-white" />
    </span>
  ) : (
    <span className={`inline-block h-5 w-5 shrink-0 border-2 border-[var(--color-neutral-300)] ${shape}`} />
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
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
      />
    </label>
  )
}
