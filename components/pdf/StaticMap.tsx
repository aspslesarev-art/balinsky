'use client'

// Статичная спутниковая карта для печатной презентации: тайлы Esri обычными
// <img> и холст поверх (круги радиусов, точки мест, тепловое пятно туристов).
// Google и maplibre в печать Chrome не попадают — у них WebGL и ленивые тайлы.

import { useEffect, useRef, useState } from 'react'
import { BLOB, fetchHeatCells, makeBrush, makePalette } from '@/lib/heat-overlay'

export type MapPoint = { lat: number; lng: number; color: string; size?: number }

const TILE = 256
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile'

function worldPx(lat: number, lng: number, z: number) {
  const n = 2 ** z * TILE
  const s = Math.sin((lat * Math.PI) / 180)
  return { x: ((lng + 180) / 360) * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n }
}

/** Метров в одном пикселе на этой широте и зуме. */
function metersPerPx(lat: number, z: number) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z
}

export function StaticMap({ lat, lng, zoom, width, height, rings = [], points = [], heat = false, dim = 0.2, label }: {
  lat: number
  lng: number
  zoom: number
  width: number
  height: number
  /** Радиусы кругов в метрах с подписями. */
  rings?: { m: number; label: string }[]
  points?: MapPoint[]
  heat?: boolean
  /** Притушить снимок, чтобы точки и пятна читались. */
  dim?: number
  /** Подпись «Esri, Maxar» в углу. */
  label?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [heatData, setHeatData] = useState<Awaited<ReturnType<typeof fetchHeatCells>> | null>(null)
  const c = worldPx(lat, lng, zoom)
  const x0 = c.x - width / 2
  const y0 = c.y - height / 2

  useEffect(() => {
    if (heat) fetchHeatCells().then(setHeatData).catch(() => setHeatData({ cells: [], max: 1 }))
  }, [heat])

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const dpr = 2
    cv.width = width * dpr
    cv.height = height * dpr
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)
    if (dim > 0) {
      ctx.fillStyle = `rgba(15, 26, 21, ${dim})`
      ctx.fillRect(0, 0, width, height)
    }
    const toPx = (la: number, ln: number) => {
      const p = worldPx(la, ln, zoom)
      return { x: p.x - x0, y: p.y - y0 }
    }

    if (heat && heatData && heatData.cells.length) {
      // То же пятно, что на сайте (lib/heat-overlay.ts): плотность в пикселях
      // экрана, затем раскраска от синего к красному.
      const off = document.createElement('canvas')
      off.width = width
      off.height = height
      const o = off.getContext('2d')!
      const brush = makeBrush()
      for (const cell of heatData.cells) {
        const p = toPx(cell.lat, cell.lng)
        if (p.x < -BLOB * 2 || p.y < -BLOB * 2 || p.x > width + BLOB * 2 || p.y > height + BLOB * 2) continue
        o.globalAlpha = Math.max(0.08, Math.min(1, Math.sqrt(cell.weight / heatData.max)))
        o.drawImage(brush, p.x - BLOB, p.y - BLOB)
      }
      const img = o.getImageData(0, 0, width, height)
      const pal = makePalette()
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3]
        if (a === 0) continue
        const j = a * 4
        d[i] = pal[j]; d[i + 1] = pal[j + 1]; d[i + 2] = pal[j + 2]
        d[i + 3] = Math.min(210, a + 40)
      }
      o.putImageData(img, 0, 0)
      ctx.drawImage(off, 0, 0)
    }

    const mpp = metersPerPx(lat, zoom)
    ctx.font = '600 14px Onest, system-ui, sans-serif'
    for (const r of rings) {
      const rad = r.m / mpp
      ctx.beginPath()
      ctx.arc(width / 2, height / 2, rad, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.stroke()
    }
    for (const p of points) {
      const q = toPx(p.lat, p.lng)
      if (q.x < 0 || q.y < 0 || q.x > width || q.y > height) continue
      const s = p.size ?? 6
      ctx.beginPath()
      ctx.arc(q.x, q.y, s, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#0F1A15'
      ctx.stroke()
    }
    // Подписи кругов — поверх точек, на верхней кромке; самый маленький — справа.
    for (const r of rings) {
      const rad = r.m / mpp
      const tw = ctx.measureText(r.label).width
      const small = rad < 40
      const lx = small ? width / 2 + rad + 10 : width / 2 - tw / 2
      const ly = small ? height / 2 - 11 : height / 2 - rad - 11
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath()
      ctx.roundRect(lx - 8, ly, tw + 16, 22, 11)
      ctx.fill()
      ctx.fillStyle = '#0F1A15'
      ctx.fillText(r.label, lx, ly + 16)
    }
    // Сам объект — зелёная точка в центре.
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 11, 0, Math.PI * 2)
    ctx.fillStyle = '#1F8B5F'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()
  }, [width, height, rings, points, heat, heatData, dim, lat, lng, zoom, x0, y0])

  const tiles: { key: string; src: string; left: number; top: number }[] = []
  for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + width) / TILE); tx++) {
    for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + height) / TILE); ty++) {
      tiles.push({ key: `${tx}-${ty}`, src: `${ESRI}/${zoom}/${ty}/${tx}`, left: tx * TILE - x0, top: ty * TILE - y0 })
    }
  }

  return (
    <div className="relative overflow-hidden bg-[#1c2a22]" style={{ width, height }}>
      {tiles.map(t => (
        // eslint-disable-next-line @next/next/no-img-element -- тайлы карты, next/image тут лишний
        <img key={t.key} src={t.src} alt="" width={TILE} height={TILE} className="absolute max-w-none" style={{ left: t.left, top: t.top }} />
      ))}
      <canvas ref={canvas} className="absolute inset-0" style={{ width, height }} aria-hidden="true" />
      {label && <span className="absolute bottom-2 right-3 text-[11px] text-white/85">{label}</span>}
    </div>
  )
}
