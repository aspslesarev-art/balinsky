'use client'

// Public viewer for the interactive ЖК visualisation.
//
// The complex page passes the full layer tree + hotspots; the viewer
// renders one layer at a time with an SVG overlay of clickable
// polygons. Tapping a hotspot either drills into its target layer
// (smooth swap) or opens a small unit-info popup with a link to the
// unit's detail page.
//
// Two notable UX details:
//
//   - The popup is rendered into a portal on document.body and
//     positioned `fixed` in viewport coordinates with smart-flip
//     so it never gets clipped by the viewer container or sticky
//     headers. If a click is in the bottom-right quadrant of the
//     viewport, the popup flips to top-left of the cursor, etc.
//
//   - On mobile, wide complex panoramas are usually much wider
//     than the device. The image lives inside an `overflow-x-auto`
//     scroll container with a configurable min-width so the
//     visitor can pan horizontally and tap hotspots at any scroll
//     position. Plus +/− zoom controls in the corner work for both
//     mobile and desktop.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ExternalLink, BedDouble, ZoomIn, ZoomOut } from 'lucide-react'
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
}
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
  const [popup, setPopup] = useState<{ clientX: number; clientY: number; unit: UnitInfo } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [dragging, setDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{ pageX: number; pageY: number; scrollLeft: number; scrollTop: number; moved: boolean } | null>(null)

  useEffect(() => { setMounted(true) }, [])
  // Reset zoom when layer swaps so the visitor isn't stuck zoomed in.
  useEffect(() => { setZoom(1); setPopup(null) }, [stack])
  // Close popup on Esc / scroll / resize so it never sticks orphaned.
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
    // If the user dragged the canvas (pan), the synthetic click that
    // fires on mouseup is just the end of the drag — don't treat
    // it as a hotspot tap.
    if (dragStateRef.current?.moved) return
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
      setPopup({ clientX: ev.clientX, clientY: ev.clientY, unit })
    }
  }

  // Drag-to-pan when zoomed > 100 %. mousedown captures starting
  // scrollLeft/Top + pointer position; mousemove (on document, so
  // the drag survives leaving the canvas) updates scroll offsets;
  // mouseup releases. `moved` flag lets onPolygonClick distinguish
  // a real tap from the click that fires at the end of a drag.
  function onCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (zoom <= 1) return
    if (e.button !== 0) return
    const el = scrollRef.current
    if (!el) return
    dragStateRef.current = {
      pageX: e.pageX, pageY: e.pageY,
      scrollLeft: el.scrollLeft, scrollTop: el.scrollTop,
      moved: false,
    }
    setDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      const s = dragStateRef.current
      const el = scrollRef.current
      if (!s || !el) return
      const dx = e.pageX - s.pageX
      const dy = e.pageY - s.pageY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.moved = true
      el.scrollLeft = s.scrollLeft - dx
      el.scrollTop = s.scrollTop - dy
    }
    function onUp() {
      setDragging(false)
      // Defer clearing the drag flag so the click that fires
      // immediately after mouseup still sees `moved=true` and
      // gets ignored by onPolygonClick.
      const s = dragStateRef.current
      setTimeout(() => { if (dragStateRef.current === s) dragStateRef.current = null }, 0)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

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
          ? 'Tap a highlighted area to drill in or open the unit\'s page. Pinch / scroll to navigate.'
          : 'Тап по подсвеченной зоне — детализация или страница юнита. Скролл / зум — навигация.'}
      </div>

      <div className="rounded-2xl overflow-hidden bg-[var(--color-search-bg)] border border-[var(--color-border)] relative">
        {/* Top-left back button */}
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
          <div className="absolute top-3 right-[120px] z-10 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[12px] text-[#111827] shadow-md max-w-[40vw] truncate">
            {currentLayer.title}
          </div>
        )}

        {/* Top-right zoom controls — work on touch + desktop. */}
        <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-0.5 rounded-full bg-white/90 backdrop-blur shadow-md p-0.5">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))}
            disabled={zoom <= 1}
            className="px-2 py-1.5 rounded-full text-[#111827] disabled:opacity-30"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="px-2 text-[11px] tabular-nums text-[#111827] min-w-[42px]"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
            disabled={zoom >= 4}
            className="px-2 py-1.5 rounded-full text-[#111827] disabled:opacity-30"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Scroll container — overflow-auto so a zoomed image (or
            naturally wide panorama on a small screen) can be panned
            with native scroll / touch. */}
        <div
          ref={scrollRef}
          className={`relative overflow-auto ${zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
          onClick={() => setPopup(null)}
          onMouseDown={onCanvasMouseDown}
        >
          {/* Inner wrapper sized to image; transform-scale keeps SVG
              overlay aligned regardless of zoom level. width:100%
              keeps the photo within container bounds — no min-width
              that would push it past the viewport (broke mobile
              layout in the previous iteration). User reaches finer
              detail via the +/− zoom buttons + drag-pan. */}
          <div
            className="relative inline-block"
            style={{
              width: zoom === 1 ? '100%' : `${zoom * 100}%`,
              transformOrigin: 'top left',
            }}
          >
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
                return (
                  <polygon
                    key={h.id}
                    points={points}
                    onClick={ev => onPolygonClick(h, ev)}
                    fill="rgba(31,139,95,0.30)"
                    stroke="#1F8B5F"
                    strokeWidth={0.003}
                    vectorEffect="non-scaling-stroke"
                    className="pointer-events-auto cursor-pointer hover:fill-[rgba(31,139,95,0.50)]"
                  >
                    {h.label && <title>{h.label}</title>}
                  </polygon>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Popup portal — fixed positioning anchored to viewport, so it
          never gets clipped by the viewer container, sticky headers,
          or any overflow:hidden ancestor. */}
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
  popup: { clientX: number; clientY: number; unit: UnitInfo }
  copy: { back: string; open: string; sqm: string; br: string }
  onDismiss: () => void
}) {
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

    // Centre horizontally on cursor, then clamp.
    const rawLeft = popup.clientX - w / 2
    const left = Math.max(margin, Math.min(vw - w - margin, rawLeft))

    setPos({ left, top })
  }, [popup])

  return (
    <div
      ref={ref}
      onClick={e => e.stopPropagation()}
      style={{ position: 'fixed', left: pos.left, top: pos.top, width: POPUP_W, zIndex: 1000 }}
      className="bg-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border border-[var(--color-border)] p-3"
    >
      {popup.unit.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={popup.unit.photoUrl} alt={popup.unit.title} className="w-full h-32 object-cover rounded-xl mb-2" />
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
  )
}
