'use client'

import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import { Flame } from 'lucide-react'
import type { HeatCell } from '@/lib/reviews-heat'

// Google removed visualization.HeatmapLayer in Maps JS v3.65, so we render the
// heat as translucent weight-coloured circles (core Circle API). One ~0.65 km
// disc per grid cell, blue (few reviews) → red (many); overlapping discs in
// busy areas blend into a continuous hot zone.
function heatHex(t: number): string {
  const h = 220 * (1 - Math.max(0, Math.min(1, t))) // 220°=blue → 0°=red
  const s = 0.85, l = 0.5
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c } else { r = c; b = x }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function ReviewsHeatLayer({
  cells,
  max,
  visible,
}: {
  cells: HeatCell[]
  max: number
  visible: boolean
}) {
  const map = useMap()
  const circlesRef = useRef<google.maps.Circle[] | null>(null)

  useEffect(() => {
    if (!map || cells.length === 0 || typeof google === 'undefined' || !google.maps?.Circle) return
    try {
      if (!circlesRef.current) {
        circlesRef.current = cells.map(c => {
          // sqrt lifts the mid-range so zones read as a gradient rather than a
          // few red dots on an all-blue map (review weights are very skewed).
          const t = Math.min(1, Math.sqrt(c.weight / max))
          return new google.maps.Circle({
            center: { lat: c.lat, lng: c.lng },
            radius: 650,
            fillColor: heatHex(t),
            fillOpacity: 0.4,
            strokeWeight: 0,
            clickable: false,
            zIndex: 1,
          })
        })
      }
      for (const circle of circlesRef.current) circle.setMap(visible ? map : null)
    } catch {
      // Never let the overlay take the whole map page down.
      circlesRef.current?.forEach(c => c.setMap(null))
      circlesRef.current = null
    }
  }, [map, cells, max, visible])

  useEffect(() => () => { circlesRef.current?.forEach(c => c.setMap(null)) }, [])

  return null
}

// Pill toggle + legend, rendered over the map (outside <Map>).
export function ReviewsHeatToggle({
  on,
  onToggle,
  lang = 'ru',
}: {
  on: boolean
  onToggle: () => void
  lang?: 'ru' | 'en'
}) {
  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={on}
        className={
          'inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium shadow-md backdrop-blur transition-colors cursor-pointer border ' +
          (on
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'bg-white/90 text-[#111827] border-[var(--color-border)] hover:border-[var(--color-primary)]')
        }
      >
        <Flame size={15} className={on ? 'text-white' : 'text-[#FF5A36]'} />
        {lang === 'en' ? 'Reviews heatmap' : 'Тепловая карта отзывов'}
      </button>
      {on && (
        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur shadow-sm text-[11px] text-[var(--color-text-muted)]">
          <span>{lang === 'en' ? 'few' : 'мало'}</span>
          <span
            className="h-2 w-24 rounded-full"
            style={{ background: 'linear-gradient(90deg, #2b6cff, #00c2c7, #8ed11f, #ffd200, #ff2d00)' }}
          />
          <span>{lang === 'en' ? 'many' : 'много'}</span>
        </div>
      )}
    </div>
  )
}
