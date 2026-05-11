'use client'

// Public viewer for the interactive ЖК visualisation.
//
// Renders one layer at a time with an SVG overlay of clickable
// polygons. Tapping a hotspot either drills into its target layer
// (smooth swap) or opens a small unit-info popup with a link to the
// unit's detail page.
//
// Popup is rendered into a portal on document.body and positioned
// `fixed` in viewport coordinates with smart-flip placement so it
// never gets clipped by the viewer container or sticky headers.
//
// Zoom + pan have been intentionally removed for the public viewer
// per owner request — admin still gets them in the editor.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ExternalLink, BedDouble } from 'lucide-react'
import Link from 'next/link'

type Layer = {
  id: number
  parentLayerId: number | null
  title: string | null
  photoUrl: string
}
type Hotspot = {
  id: number
  layerId: number
  label: string | null
  polygon: [number, number][]
  targetType: 'layer' | 'unit'
  targetLayerId: number | null
  targetUnitKind: 'villa' | 'apartment' | null
  targetUnitSlug: string | null
  availability?: 'free' | 'reserved' | 'sold' | null
}

// Polygon palette per status. The "neutral" / null case keeps the
// original brand-green so existing visualisations look unchanged.
const STATUS_STYLE = {
  free:     { fill: 'rgba(22,163,74,0.30)',  stroke: '#16A34A', hover: 'hover:fill-[rgba(22,163,74,0.50)]' },
  reserved: { fill: 'rgba(245,158,11,0.30)', stroke: '#F59E0B', hover: 'hover:fill-[rgba(245,158,11,0.50)]' },
  sold:     { fill: 'rgba(220,38,38,0.30)',  stroke: '#DC2626', hover: 'hover:fill-[rgba(220,38,38,0.40)]' },
  neutral:  { fill: 'rgba(31,139,95,0.30)',  stroke: '#1F8B5F', hover: 'hover:fill-[rgba(31,139,95,0.50)]' },
} as const
type UnitInfo = {
  kind: 'villa' | 'apartment'
  slug: string
  title: string
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
  url: string
  photoUrl: string | null
}

const POPUP_W = 280
const POPUP_H_GUESS = 220   // upper bound used for flip placement; actual measured after mount.

export function ComplexVisualizationViewer({
  layers, hotspots, unitsBySlug, lang = 'ru',
}: {
  layers: Layer[]
  hotspots: Hotspot[]
  unitsBySlug: Record<string, UnitInfo>
  lang?: 'ru' | 'en'
}) {
  const root = layers.find(l => l.parentLayerId == null) ?? layers[0]
  const [stack, setStack] = useState<Layer[]>(root ? [root] : [])
  const [popup, setPopup] = useState<{ clientX: number; clientY: number; unit: UnitInfo; availability: 'free' | 'reserved' | 'sold' | null } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setPopup(null) }, [stack])
  useEffect(() => {
    if (!popup) return
    const close = () => setPopup(null)
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('resize', close)
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [popup])

  if (!root || stack.length === 0) return null
  const currentLayer = stack[stack.length - 1]
  const currentHotspots = hotspots.filter(h => h.layerId === currentLayer.id)

  function onPolygonClick(h: Hotspot, ev: React.MouseEvent<SVGPolygonElement>) {
    ev.stopPropagation()
    if (h.targetType === 'layer' && h.targetLayerId != null) {
      const next = layers.find(l => l.id === h.targetLayerId)
      if (next) {
        setStack(prev => [...prev, next])
        setPopup(null)
      }
      return
    }
    if (h.targetType === 'unit' && h.targetUnitSlug) {
      const unit = unitsBySlug[h.targetUnitSlug]
      if (!unit) return
      setPopup({ clientX: ev.clientX, clientY: ev.clientY, unit, availability: h.availability ?? null })
    }
  }

  function back() {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev)
    setPopup(null)
  }

  const COPY = lang === 'en'
    ? { back: 'Back', open: 'Open', sqm: 'm²', br: 'BR' }
    : { back: 'Назад', open: 'Открыть', sqm: 'м²', br: 'BR' }

  return (
    <section className="mb-10">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
        {lang === 'en' ? 'Interactive plan' : 'Интерактивный план'}
      </h2>
      <div className="text-[13px] text-[var(--color-text-muted)] mb-4">
        {lang === 'en'
          ? 'Tap a highlighted area to drill in or open the unit\'s page.'
          : 'Тап по подсвеченной зоне — детализация или страница юнита.'}
      </div>

      <div className="rounded-2xl overflow-hidden bg-[var(--color-search-bg)] border border-[var(--color-border)] relative">
        {stack.length > 1 && (
          <div className="absolute top-3 left-3 z-10">
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[13px] text-[#111827] shadow-md hover:bg-white"
            >
              <ChevronLeft size={14} /> {COPY.back}
            </button>
          </div>
        )}
        {currentLayer.title && (
          <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[12px] text-[#111827] shadow-md max-w-[60vw] truncate">
            {currentLayer.title}
          </div>
        )}

        <div className="relative" onClick={() => setPopup(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentLayer.photoUrl}
            alt={currentLayer.title ?? ''}
            className="block w-full h-auto select-none"
            draggable={false}
          />
          <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {currentHotspots.map(h => {
              const points = h.polygon.map(([x, y]) => `${x},${y}`).join(' ')
              const palette = STATUS_STYLE[h.availability ?? 'neutral'] ?? STATUS_STYLE.neutral
              const isSold = h.availability === 'sold'
              return (
                <polygon
                  key={h.id}
                  points={points}
                  onClick={ev => onPolygonClick(h, ev)}
                  fill={palette.fill}
                  stroke={palette.stroke}
                  strokeWidth={0.003}
                  vectorEffect="non-scaling-stroke"
                  className={`pointer-events-auto ${isSold ? 'cursor-not-allowed' : 'cursor-pointer'} ${palette.hover}`}
                >
                  {(h.label || h.availability) && (
                    <title>
                      {h.label ?? ''}
                      {h.availability && (h.label ? ' · ' : '') +
                        (h.availability === 'free' ? 'свободно' : h.availability === 'reserved' ? 'забронировано' : 'продано')}
                    </title>
                  )}
                </polygon>
              )
            })}
          </svg>
        </div>
      </div>

      {mounted && popup && createPortal(
        <UnitPopup popup={popup} copy={COPY} onDismiss={() => setPopup(null)} />,
        document.body,
      )}
    </section>
  )
}

function UnitPopup({
  popup, copy, onDismiss,
}: {
  popup: { clientX: number; clientY: number; unit: UnitInfo; availability: 'free' | 'reserved' | 'sold' | null }
  copy: { back: string; open: string; sqm: string; br: string }
  onDismiss: () => void
}) {
  const statusBadge = popup.availability ? {
    free:     { text: 'Свободно',      cls: 'bg-[#16A34A] text-white' },
    reserved: { text: 'Забронировано', cls: 'bg-[#F59E0B] text-white' },
    sold:     { text: 'Продано',        cls: 'bg-[#DC2626] text-white' },
  }[popup.availability] : null
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 })

  // After mount, measure actual popup height and place it relative
  // to the click point with smart flipping: prefer below+centred,
  // flip above if not enough room below; clamp to viewport with
  // 12 px margin so it never bleeds off the edge.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth || POPUP_W
    const h = el.offsetHeight || POPUP_H_GUESS
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 12

    const spaceBelow = vh - popup.clientY
    const placeBelow = spaceBelow >= h + margin + 8 || popup.clientY < h + margin + 8
    const top = placeBelow ? Math.min(vh - h - margin, popup.clientY + 12) : Math.max(margin, popup.clientY - h - 12)

    const rawLeft = popup.clientX - w / 2
    const left = Math.max(margin, Math.min(vw - w - margin, rawLeft))

    setPos({ left, top })
  }, [popup])

  return (
    <div
      ref={ref}
      onClick={e => e.stopPropagation()}
      style={{ position: 'fixed', left: pos.left, top: pos.top, width: POPUP_W, zIndex: 1000 }}
      // overflow-hidden + rounded-2xl on the outer card → photo
      // clips to the rounded corners flush with no inner padding,
      // text body keeps its p-3 breathing room.
      className="bg-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border border-[var(--color-border)] overflow-hidden"
    >
      {popup.unit.photoUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={popup.unit.photoUrl} alt={popup.unit.title} className="block w-full h-36 object-cover" />
          {statusBadge && (
            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wide ${statusBadge.cls}`}>
              {statusBadge.text}
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        {!popup.unit.photoUrl && statusBadge && (
          <div className={`inline-block mb-2 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wide ${statusBadge.cls}`}>
            {statusBadge.text}
          </div>
        )}
        <div className="text-[14px] font-semibold text-[#111827] line-clamp-2 mb-1">{popup.unit.title}</div>
        <div className="text-[12px] text-[var(--color-text-muted)] flex items-center gap-2 flex-wrap mb-2">
          {popup.unit.bedrooms != null && (<span className="inline-flex items-center gap-1"><BedDouble size={11} />{popup.unit.bedrooms} {copy.br}</span>)}
          {popup.unit.area != null && <span>{popup.unit.area} {copy.sqm}</span>}
          {popup.unit.priceUsd != null && <span>${popup.unit.priceUsd.toLocaleString('en-US')}</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Link
            href={popup.unit.url}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1F8B5F] hover:text-[#197551] no-underline"
          >
            <ExternalLink size={12} /> {copy.open}
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
