'use client'

import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import { Flame } from 'lucide-react'
import type { HeatCell } from '@/lib/reviews-heat'

const BLOB = 42 // on-screen blob radius (px)

// Grayscale radial brush — drawn once per point with alpha = intensity so
// overlapping points accumulate density (classic heatmap.js / simpleheat).
function makeBrush(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = BLOB * 2
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(BLOB, BLOB, 0, BLOB, BLOB, BLOB)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, BLOB * 2, BLOB * 2)
  return c
}

// 256-entry blue→red palette indexed by accumulated alpha.
function makePalette(): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0.0, '#2b6cff')
  g.addColorStop(0.35, '#00c2c7')
  g.addColorStop(0.55, '#8ed11f')
  g.addColorStop(0.78, '#ffd200')
  g.addColorStop(1.0, '#ff2d00')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1, 256)
  return ctx.getImageData(0, 0, 1, 256).data
}

// Google removed visualization.HeatmapLayer (Maps JS v3.65), so we paint our
// own on a canvas OverlayView: accumulate per-point density in screen space,
// then colourise — a real, smooth heatmap that stays aligned and crisp at any
// zoom (a metre-radius circle is invisible at the island-wide default zoom).
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
        class HeatOverlay extends google.maps.OverlayView {
          canvas: HTMLCanvasElement | null = null
          brush = makeBrush()
          palette = makePalette()
          onAdd() {
            const cv = document.createElement('canvas')
            cv.style.position = 'absolute'
            cv.style.top = '0'
            cv.style.left = '0'
            cv.style.pointerEvents = 'none'
            this.canvas = cv
            // Pin to the map container itself (not a transformed pane) and draw
            // in container pixels — immune to pane translation, so it stays
            // aligned through pan/zoom. Translucent, so markers stay readable.
            safeMap.getDiv().appendChild(cv)
          }
          draw() {
            const proj = this.getProjection()
            const cv = this.canvas
            if (!proj || !cv) return
            const div = safeMap.getDiv()
            const w = div.offsetWidth, h = div.offsetHeight
            if (w <= 0 || h <= 0) return
            if (cv.width !== w) cv.width = w
            if (cv.height !== h) cv.height = h
            const ctx = cv.getContext('2d')
            if (!ctx) return
            ctx.clearRect(0, 0, w, h)
            const pad = BLOB * 2

            // Pass 1 — accumulate grayscale density.
            let minX = w, minY = h, maxX = 0, maxY = 0, drew = false
            for (const cell of cells) {
              const p = proj.fromLatLngToContainerPixel(new google.maps.LatLng(cell.lat, cell.lng))
              if (!p) continue
              const x = p.x, y = p.y
              if (x < -pad || y < -pad || x > w + pad || y > h + pad) continue
              const t = Math.max(0.08, Math.min(1, Math.sqrt(cell.weight / max)))
              ctx.globalAlpha = t
              ctx.drawImage(this.brush, x - BLOB, y - BLOB)
              drew = true
              minX = Math.min(minX, x - BLOB); minY = Math.min(minY, y - BLOB)
              maxX = Math.max(maxX, x + BLOB); maxY = Math.max(maxY, y + BLOB)
            }
            ctx.globalAlpha = 1
            if (!drew) return

            // Pass 2 — colourise the accumulated alpha (only the touched rect).
            const rx = Math.max(0, Math.floor(minX)), ry = Math.max(0, Math.floor(minY))
            const rw = Math.min(w, Math.ceil(maxX)) - rx, rh = Math.min(h, Math.ceil(maxY)) - ry
            if (rw <= 0 || rh <= 0) return
            const img = ctx.getImageData(rx, ry, rw, rh)
            const d = img.data, pal = this.palette
            for (let i = 0; i < d.length; i += 4) {
              const a = d[i + 3]
              if (a === 0) continue
              const j = a * 4
              d[i] = pal[j]; d[i + 1] = pal[j + 1]; d[i + 2] = pal[j + 2]
              d[i + 3] = Math.min(210, a + 40) // soft, see-through heat
            }
            ctx.putImageData(img, rx, ry)
          }
          onRemove() {
            this.canvas?.remove()
            this.canvas = null
          }
        }
        overlayRef.current = new HeatOverlay()
      }
      overlayRef.current.setMap(visible ? safeMap : null)
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
