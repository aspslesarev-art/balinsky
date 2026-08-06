'use client'

// Schematic massing of a complex with a real sun: blocks are extruded from the
// vision-derived storey counts, and the light comes from the actual solar
// position for this listing's coordinates, date and time of day.
//
// Deliberately abstract — untextured grey volumes. There are no surveys, plans
// or plot outlines in the data, so anything that looked photorealistic would be
// claiming knowledge we do not have.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MassingEntry } from '@/lib/listing-massing'
import type { Lang } from '@/lib/i18n'

type Props = {
  massing: MassingEntry
  lat: number
  lng: number
  siteSize: number
  lang: Lang
}

const COPY: Record<string, { title: string; time: string; month: string; turn: string; note: string; sunUp: string; sunDown: string; plot: string }> = {
  ru: {
    title: 'Схема застройки и солнце',
    time: 'Время суток',
    month: 'Месяц',
    turn: 'Поворот',
    note: 'Схема, а не модель здания: состав строений и этажность распознаны по фотографиям, размер участка прикинут по числу юнитов. Положение солнца и тени рассчитаны по координатам объекта.',
    sunUp: 'над горизонтом',
    sunDown: 'солнце за горизонтом',
    plot: 'участок ~',
  },
  en: {
    title: 'Site massing and sunlight',
    time: 'Time of day',
    month: 'Month',
    turn: 'Rotate',
    note: 'A diagram, not a building model: the structures and storey counts are read from photographs and the plot size is estimated from the unit count. The sun position and shadows are computed from the listing coordinates.',
    sunUp: 'above the horizon',
    sunDown: 'sun below the horizon',
    plot: 'plot ~',
  },
}

const MONTHS: Record<string, string[]> = {
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

const STOREY_M = 3.2
// Bali sits on UTC+8; the solar-time correction needs the standard meridian.
const TZ_OFFSET_MIN = 8 * 60

function sunPos(lat: number, lng: number, month: number, hour: number) {
  const doy = Math.round((month - 0.5) * 30.44)
  const g = ((2 * Math.PI) / 365) * (doy - 1 + (hour - 12) / 24)
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const tst = hour * 60 + eqtime + 4 * lng - TZ_OFFSET_MIN
  const ha = ((tst / 4 - 180) * Math.PI) / 180
  const la = (lat * Math.PI) / 180
  const cosZ = Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha)
  const alt = Math.asin(Math.max(-1, Math.min(1, cosZ)))
  const az = Math.atan2(-Math.sin(ha), Math.tan(decl) * Math.cos(la) - Math.sin(la) * Math.cos(ha))
  return { alt, az }
}

type Box = { x: number; y: number; w: number; d: number; h: number; roof: string }

function layout(m: MassingEntry, site: number): Box[] {
  const n = m.buildings.length
  const total = m.buildings.reduce((a, b) => a + b.footprint_share, 0) || 1
  const coverage = m.density === 'high' ? 0.45 : m.density === 'medium' ? 0.32 : 0.22
  const built = site * site * coverage
  return m.buildings.map((b, i) => {
    const area = built * (b.footprint_share / total)
    const ratio = b.form === 'bar' ? 3.2 : b.form === 'L' || b.form === 'U' ? 1.8 : 1.25
    const w = Math.sqrt(area * ratio)
    const d = area / w
    let x = 0
    let y = 0
    if (m.site_layout === 'row') {
      x = (i - (n - 1) / 2) * (site / Math.max(n, 1))
    } else if (m.site_layout === 'courtyard') {
      const a = (i / n) * Math.PI * 2
      x = Math.cos(a) * site * 0.26
      y = Math.sin(a) * site * 0.26
    } else if (m.site_layout !== 'single' && m.site_layout !== 'tower') {
      const cols = Math.ceil(Math.sqrt(n))
      x = ((i % cols) - (cols - 1) / 2) * ((site / cols) * 1.15)
      y = (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * ((site / cols) * 1.15)
    }
    return { x, y, w, d, h: b.storeys * STOREY_M, roof: b.roof }
  })
}

function convexHull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo: [number, number][] = []
  const up: [number, number][] = []
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop()
    lo.push(q)
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop()
    up.push(q)
  }
  lo.pop()
  up.pop()
  return lo.concat(up)
}

export function MassingScheme({ massing, lat, lng, siteSize, lang }: Props) {
  const t = COPY[lang] ?? COPY.en
  const months = MONTHS[lang] ?? MONTHS.en
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hour, setHour] = useState(9)
  const [month, setMonth] = useState(8)
  const [rotDeg, setRotDeg] = useState(35)

  const boxes = useMemo(() => layout(massing, siteSize), [massing, siteSize])
  const sun = useMemo(() => sunPos(lat, lng, month, hour), [lat, lng, month, hour])

  useEffect(() => {
    const canvas = canvasRef.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return

    const { alt, az } = sun
    const day = alt > 0.02
    const rot = (rotDeg * Math.PI) / 180
    const scale = Math.min(canvas.width / (siteSize * 2.1), canvas.height / (siteSize * 1.5))
    const cx = canvas.width / 2
    const cy = canvas.height * 0.62
    const tilt = 0.62
    const project = (x: number, y: number, z: number): [number, number] => {
      const e = x * Math.cos(rot) - y * Math.sin(rot)
      const n = x * Math.sin(rot) + y * Math.cos(rot)
      return [cx + e * scale, cy + n * scale * Math.cos(tilt) - z * scale * Math.sin(tilt)]
    }
    const poly = (pts: [number, number][], fill: string, stroke?: string) => {
      g.beginPath()
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)))
      g.closePath()
      g.fillStyle = fill
      g.fill()
      if (stroke) {
        g.strokeStyle = stroke
        g.lineWidth = 1
        g.stroke()
      }
    }

    g.clearRect(0, 0, canvas.width, canvas.height)
    const half = siteSize / 2
    poly(([[-half, -half], [half, -half], [half, half], [-half, half]] as [number, number][]).map(([x, y]) => project(x, y, 0)), day ? '#cdd7c4' : '#5c6360', 'rgba(0,0,0,.25)')

    if (massing.pool?.present) {
      const py = massing.pool.position === 'front' ? half * 0.55 : massing.pool.position === 'rear' ? -half * 0.55 : 0
      const pw = siteSize * 0.16
      const pd = siteSize * 0.07
      poly(([[-pw, py - pd], [pw, py - pd], [pw, py + pd], [-pw, py + pd]] as [number, number][]).map(([x, y]) => project(x, y, 0.05)), day ? '#4aa6c8' : '#2b5c70')
    }

    const depthOf = (x: number, y: number) => x * Math.sin(rot) + y * Math.cos(rot)
    const ordered = [...boxes].sort((a, b) => depthOf(a.x, a.y) - depthOf(b.x, b.y))

    if (day) {
      const k = 1 / Math.tan(Math.max(alt, 0.08))
      const sunH: [number, number] = [Math.sin(az), Math.cos(az)]
      g.fillStyle = `rgba(20,25,35,${0.1 + 0.28 * Math.max(0, Math.cos(alt))})`
      for (const b of ordered) {
        const off: [number, number] = [-sunH[0] * b.h * k, -sunH[1] * b.h * k]
        const base: [number, number][] = [[-b.w / 2, -b.d / 2], [b.w / 2, -b.d / 2], [b.w / 2, b.d / 2], [-b.w / 2, b.d / 2]]
        const pts: [number, number][] = base.map(([x, y]) => [b.x + x, b.y + y] as [number, number])
          .concat(base.map(([x, y]) => [b.x + x + off[0], b.y + y + off[1]] as [number, number]))
        g.beginPath()
        convexHull(pts).forEach(([x, y], i) => {
          const p = project(x, y, 0.02)
          if (i) g.lineTo(p[0], p[1])
          else g.moveTo(p[0], p[1])
        })
        g.closePath()
        g.fill()
      }
    }

    const sv = [Math.cos(alt) * Math.sin(az), Math.cos(alt) * Math.cos(az), Math.sin(alt)]
    for (const b of ordered) {
      const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, y0 = b.y - b.d / 2, y1 = b.y + b.d / 2, h = b.h
      const faces: { n: number[]; q: [number, number, number][] }[] = [
        { n: [0, -1, 0], q: [[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]] },
        { n: [0, 1, 0], q: [[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]] },
        { n: [-1, 0, 0], q: [[x0, y0, 0], [x0, y1, 0], [x0, y1, h], [x0, y0, h]] },
        { n: [1, 0, 0], q: [[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]] },
        { n: [0, 0, 1], q: [[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]] },
      ]
      const sorted = faces
        .map(f => ({ ...f, depth: f.q.reduce((a, p) => a + depthOf(p[0], p[1]), 0) / 4 }))
        .sort((a, b2) => a.depth - b2.depth)
      for (const f of sorted) {
        const dot = day ? Math.max(0, f.n[0] * sv[0] + f.n[1] * sv[1] + f.n[2] * sv[2]) : 0
        const lum = day ? 0.42 + 0.58 * dot : 0.3
        const base = f.n[2] === 1
          ? (b.roof === 'thatch' ? [140, 96, 60] : b.roof === 'pitched' ? [156, 116, 92] : [196, 198, 200])
          : [232, 228, 220]
        poly(f.q.map(p => project(p[0], p[1], p[2])), `rgb(${base.map(v => Math.round(v * lum)).join(',')})`, 'rgba(0,0,0,.22)')
      }
    }
  }, [boxes, massing, siteSize, sun, rotDeg])

  const hh = String(Math.floor(hour)).padStart(2, '0')
  const mm = String(Math.round((hour - Math.floor(hour)) * 60)).padStart(2, '0')
  const altDeg = (sun.alt * 180) / Math.PI

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="mb-1 text-lg font-semibold">{t.title}</h3>
      <p className="mb-3 text-sm text-neutral-500">
        {t.plot}{siteSize}×{siteSize} м · {altDeg > 1 ? `${altDeg.toFixed(0)}° ${t.sunUp}` : t.sunDown}
      </p>
      <canvas ref={canvasRef} width={1200} height={720} className="block w-full rounded-xl bg-gradient-to-b from-sky-100 to-slate-50 dark:from-slate-800 dark:to-slate-900" />
      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-neutral-500">{t.time}</span>
          <input type="range" min={5.5} max={18.5} step={0.25} value={hour} onChange={e => setHour(+e.target.value)} className="min-w-0 flex-1" />
          <span className="w-14 shrink-0 tabular-nums text-neutral-500">{hh}:{mm}</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-neutral-500">{t.month}</span>
          <input type="range" min={1} max={12} step={1} value={month} onChange={e => setMonth(+e.target.value)} className="min-w-0 flex-1" />
          <span className="w-14 shrink-0 text-neutral-500">{months[month - 1]}</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-neutral-500">{t.turn}</span>
          <input type="range" min={0} max={360} step={1} value={rotDeg} onChange={e => setRotDeg(+e.target.value)} className="min-w-0 flex-1" />
          <span className="w-14 shrink-0 tabular-nums text-neutral-500">{rotDeg}°</span>
        </label>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">{t.note}</p>
    </section>
  )
}
