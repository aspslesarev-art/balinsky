'use client'

// Public viewer for the interactive ЖК visualisation.
//
// The complex page passes the full layer tree + hotspots; the viewer
// renders one layer at a time with an SVG overlay of clickable
// polygons. Tapping a hotspot either drills into its target layer
// (smooth swap) or opens a small unit-info popup with a link to the
// unit's detail page.

import { useState } from 'react'
import { ChevronLeft, ExternalLink, MapPin, BedDouble } from 'lucide-react'
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

export function ComplexVisualizationViewer({
  layers, hotspots, unitsBySlug, lang = 'ru',
}: {
  layers: Layer[]
  hotspots: Hotspot[]
  unitsBySlug: Record<string, UnitInfo>
  lang?: 'ru' | 'en'
}) {
  // Root = layer with no parent. If somehow there are multiple, take
  // the first by id (admin shouldn't create more than one root, but
  // we don't assert on the schema).
  const root = layers.find(l => l.parentLayerId == null) ?? layers[0]
  const [stack, setStack] = useState<Layer[]>(root ? [root] : [])
  const [popup, setPopup] = useState<{ x: number; y: number; unit: UnitInfo } | null>(null)

  if (!root || stack.length === 0) return null
  const currentLayer = stack[stack.length - 1]
  const currentHotspots = hotspots.filter(h => h.layerId === currentLayer.id)

  function onPolygonClick(h: Hotspot, ev: React.MouseEvent<SVGPolygonElement>) {
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
      const rect = (ev.currentTarget.ownerSVGElement?.parentElement as HTMLElement | null)?.getBoundingClientRect()
      const x = rect ? ev.clientX - rect.left : 0
      const y = rect ? ev.clientY - rect.top : 0
      setPopup({ x, y, unit })
    }
  }

  function back() {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev)
    setPopup(null)
  }

  const COPY = lang === 'en'
    ? { back: 'Back', open: 'Open', from: 'from', sqm: 'm²', br: 'BR' }
    : { back: 'Назад', open: 'Открыть', from: 'от', sqm: 'м²', br: 'BR' }

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
        {/* Breadcrumb / back button */}
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
          <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[12px] text-[#111827] shadow-md">
            {currentLayer.title}
          </div>
        )}

        <div className="relative" onClick={() => setPopup(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentLayer.photoUrl} alt={currentLayer.title ?? ''} className="block w-full h-auto" />
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
                  onClick={ev => { ev.stopPropagation(); onPolygonClick(h, ev) }}
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

          {popup && (
            <div
              className="absolute z-20 w-[260px] -translate-x-1/2 bg-white rounded-2xl shadow-[var(--shadow-popover)] border border-[var(--color-border)] p-3"
              style={{ left: Math.min(Math.max(popup.x, 140), 1000), top: popup.y + 12 }}
              onClick={e => e.stopPropagation()}
            >
              {popup.unit.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={popup.unit.photoUrl} alt={popup.unit.title} className="w-full h-32 object-cover rounded-xl mb-2" />
              )}
              <div className="text-[14px] font-semibold text-[#111827] line-clamp-2 mb-1">{popup.unit.title}</div>
              <div className="text-[12px] text-[var(--color-text-muted)] flex items-center gap-2 flex-wrap mb-2">
                {popup.unit.bedrooms != null && (<span className="inline-flex items-center gap-1"><BedDouble size={11} />{popup.unit.bedrooms} {COPY.br}</span>)}
                {popup.unit.area != null && <span>{popup.unit.area} {COPY.sqm}</span>}
                {popup.unit.priceUsd != null && <span>${popup.unit.priceUsd.toLocaleString('en-US')}</span>}
              </div>
              <Link
                href={popup.unit.url}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1F8B5F] hover:text-[#197551] no-underline"
              >
                <ExternalLink size={12} /> {COPY.open}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
