'use client'

import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import { Flame } from 'lucide-react'
import type { HeatCell } from '@/lib/reviews-heat'

// "r, g, b" for a blue(0)→red(1) ramp via HSL 220°→0°.
function heatRGB(t: number): string {
  const h = 220 * (1 - Math.max(0, Math.min(1, t)))
  const s = 0.85, l = 0.5
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return `${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}`
}

// Google removed visualization.HeatmapLayer (Maps JS v3.65). We draw our own
// heatmap on a canvas OverlayView: screen-space radial blobs (fixed pixel
// radius) so it stays visible and crisp at any zoom — a metre-radius circle is
// a few pixels wide at the island-wide zoom and effectively invisible.
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
  const overlayRef = useRef<google.maps.OverlayView | null>(null)

  useEffect(() => {
    if (!map || cells.length === 0 || typeof google === 'undefined' || !google.maps?.OverlayView) return
    const safeMap = map
    try {
      if (!overlayRef.current) {
        const BLOB = 46 // on-screen blob radius in px

        class HeatOverlay extends google.maps.OverlayView {
          canvas: HTMLCanvasElement | null = null
          onAdd() {
            const cv = document.createElement('canvas')
            cv.style.position = 'absolute'
            cv.style.pointerEvents = 'none'
            cv.style.top = '0'
            cv.style.left = '0'
            this.canvas = cv
            this.getPanes()?.overlayLayer.appendChild(cv)
          }
          draw() {
            const proj = this.getProjection()
            const cv = this.canvas
            if (!proj || !cv) return
            const bounds = safeMap.getBounds()
            if (!bounds) return
            const ne = proj.fromLatLngToDivPixel(bounds.getNorthEast())
            const sw = proj.fromLatLngToDivPixel(bounds.getSouthWest())
            if (!ne || !sw) return
            // Pad the canvas so blobs whose centre sits just off-screen still
            // bleed in.
            const pad = BLOB * 2
            const left = Math.min(sw.x, ne.x) - pad
            const top = Math.min(ne.y, sw.y) - pad
            const w = Math.abs(ne.x - sw.x) + pad * 2
            const h = Math.abs(sw.y - ne.y) + pad * 2
            cv.style.left = `${left}px`
            cv.style.top = `${top}px`
            if (cv.width !== Math.round(w)) cv.width = Math.round(w)
            if (cv.height !== Math.round(h)) cv.height = Math.round(h)
            const ctx = cv.getContext('2d')
            if (!ctx) return
            ctx.clearRect(0, 0, cv.width, cv.height)
            for (const cell of cells) {
              const p = proj.fromLatLngToDivPixel(new google.maps.LatLng(cell.lat, cell.lng))
              if (!p) continue
              const x = p.x - left, y = p.y - top
              if (x < -pad || y < -pad || x > w + pad || y > h + pad) continue
              const t = Math.min(1, Math.sqrt(cell.weight / max))
              const rgb = heatRGB(t)
              const grd = ctx.createRadialGradient(x, y, 0, x, y, BLOB)
              grd.addColorStop(0, `rgba(${rgb}, 0.5)`)
              grd.addColorStop(1, `rgba(${rgb}, 0)`)
              ctx.fillStyle = grd
              ctx.beginPath()
              ctx.arc(x, y, BLOB, 0, Math.PI * 2)
              ctx.fill()
            }
          }
          onRemove() {
            this.canvas?.remove()
            this.canvas = null
          }
        }

        overlayRef.current = new HeatOverlay()
      }
      overlayRef.current.setMap(visible ? map : null)
    } catch {
      overlayRef.current?.setMap(null)
      overlayRef.current = null
    }
  }, [map, cells, max, visible])

  useEffect(() => () => { overlayRef.current?.setMap(null) }, [])

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
