'use client'

// Карта зон плана застройки во вкладке «Зоны» окна медиаблока (макет «Зоны
// вокруг», B, владелец 2026-11-11): спутник на весь экран, поверх зоны RDTR
// в радиусе, цвета GISTARU. Слева легенда, справа карточка участка; нажатие
// на участок показывает его зону. Данные - lib/rdtr-zones.ts.

import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { pickCopy, type Lang } from '@/lib/i18n'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import { RDTR_BASE, pctText, plotLabel, zoneKind, zoneRows, zoneRu, type RdtrData, type ZoneGroup } from '@/lib/rdtr-zones'

const COPY = {
  ru: {
    title: (r: number) => `Зоны в радиусе ${r >= 1000 ? `${r / 1000} км` : `${r} м`}`,
    build: 'Можно строить', nobuild: 'Жильё обычно не строят', other: 'Другое',
    plot: 'Участок объекта', picked: 'Выбранный участок', back: 'Вернуться к участку объекта',
    rules: (kdb: string | null, kdh: string | null) => [kdb ? `застроить до ${kdb} участка` : null, kdh ? `зелень от ${kdh}` : null].filter(Boolean).join(', '),
    tap: 'Нажмите на участок - покажем его зону',
    source: 'GISTARU (ATR/BPN) · снимки Esri, Maxar',
  },
  en: {
    title: (r: number) => `Zones within ${r >= 1000 ? `${r / 1000} km` : `${r} m`}`,
    build: 'Building allowed', nobuild: 'Housing usually not allowed', other: 'Other',
    plot: 'This plot', picked: 'Selected plot', back: 'Back to this plot',
    rules: (kdb: string | null, kdh: string | null) => [kdb ? `up to ${kdb} built-up` : null, kdh ? `at least ${kdh} green` : null].filter(Boolean).join(', '),
    tap: 'Tap a plot to see its zone',
    source: 'GISTARU (ATR/BPN) · imagery Esri, Maxar',
  },
} as const

function circleRing([lon, lat]: [number, number], r: number): [number, number][] {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180)
  return Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * 2 * Math.PI
    return [lon + (Math.cos(a) * r) / kx, lat + (Math.sin(a) * r) / 111320]
  })
}

export function ZoningMap({ slug, lang, ver }: { slug: string; lang: Lang; ver?: string }) {
  const c = pickCopy(COPY, lang)
  const ru = zoneRu(lang)
  const [data, setData] = useState<RdtrData | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    // ver - дата и радиус выгрузки: после пересчёта CDN не отдаст старую копию.
    fetch(cdnManifestUrl(`${RDTR_BASE}/${slug}.json${ver ? `?ver=${encodeURIComponent(ver)}` : ''}`, 86400))
      .then(r => (r.ok ? r.json() : null))
      .then((j: RdtrData | null) => { if (!cancelled) setData(j) })
      .catch(err => console.error('[zoning] load failed', err))
    return () => { cancelled = true }
  }, [slug, ver])

  useEffect(() => {
    if (!data || !mapRef.current) return
    let map: import('maplibre-gl').Map | null = null
    let cancelled = false
    import('maplibre-gl').then(({ default: ml }) => {
      if (cancelled || !mapRef.current) return
      const kx = 111320 * Math.cos((data.center[1] * Math.PI) / 180)
      const narrow = window.innerWidth < 1024
      const dLon = (data.radius * 1.1) / kx
      const dLat = (data.radius * 1.1) / 111320
      map = new ml.Map({
        container: mapRef.current,
        style: {
          version: 8,
          sources: { sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Esri, Maxar · GISTARU ATR/BPN' } },
          layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
        },
        bounds: [[data.center[0] - dLon, data.center[1] - dLat], [data.center[0] + dLon, data.center[1] + dLat]],
        // Круг - в свободной части: на телефоне сверху карточка участка, снизу легенда.
        fitBoundsOptions: { padding: narrow ? { top: 130, bottom: 150, left: 12, right: 12 } : { top: 40, bottom: 40, left: 340, right: 340 } },
        // На телефоне подпись источников стоит в легенде, иначе наезжает на неё.
        attributionControl: narrow ? false : { compact: true },
      })
      const m = map
      m.on('load', () => {
        const ring = circleRing(data.center, data.radius)
        m.addSource('bx-mask', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], ring] } } })
        m.addLayer({ id: 'bx-mask', type: 'fill', source: 'bx-mask', paint: { 'fill-color': '#0C100E', 'fill-opacity': 0.55 } })
        m.addSource('bx-zones', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: data.zones.map(z => ({ type: 'Feature', properties: { name: z.name, color: z.color }, geometry: z.geometry })) },
        })
        m.addLayer({ id: 'bx-zones', type: 'fill', source: 'bx-zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.55 } })
        m.addLayer({ id: 'bx-zones-line', type: 'line', source: 'bx-zones', paint: { 'line-color': '#FFFFFF', 'line-opacity': 0.6, 'line-width': 1 } })
        m.addSource('bx-ring', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring } } })
        m.addLayer({ id: 'bx-ring', type: 'line', source: 'bx-ring', paint: { 'line-color': '#FFFFFF', 'line-width': 2.5 } })
        m.addSource('bx-pin', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: data.center } } })
        m.addLayer({ id: 'bx-pin', type: 'circle', source: 'bx-pin', paint: { 'circle-radius': 8, 'circle-color': '#E5484D', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 } })
        m.on('click', 'bx-zones', e => {
          const name = e.features?.[0]?.properties?.name as string | undefined
          if (name) setPicked(name)
        })
        m.on('mouseenter', 'bx-zones', () => { m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', 'bx-zones', () => { m.getCanvas().style.cursor = '' })
      })
    }).catch(err => console.error('[zoning] map failed', err))
    return () => { cancelled = true; map?.remove() }
  }, [data])

  const rows = data ? zoneRows(data, lang) : []
  const plot = data ? plotLabel(data, lang) : null
  const pickedKind = picked ? zoneKind(picked) : null
  const pickedColor = picked ? data?.zones.find(z => z.name === picked)?.color : null

  const group = (g: ZoneGroup, title: string, tone: string) => {
    const items = rows.filter(r => r.group === g)
    if (!items.length) return null
    return (
      <div className="flex flex-col gap-1.5">
        <span className={`text-[12px] font-semibold uppercase tracking-wide ${tone}`}>{title}</span>
        {items.map(r => (
          <div key={r.label} className="flex items-center gap-2.5 text-[14px] min-h-6">
            <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: r.color }} />
            <span className="flex-1">{r.label}</span>
            <span className="font-semibold tabular-nums">{pctText(r.share)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-[#1A221E]">
      <div ref={mapRef} className="w-full h-full" />
      {data && (
        <>
          <div className="absolute left-3 right-3 bottom-3 lg:right-auto lg:bottom-auto lg:left-6 lg:top-6 lg:w-[300px] max-h-[55%] lg:max-h-[calc(100%-48px)] overflow-y-auto p-4 rounded-xl bg-[rgb(12_16_14/0.88)] text-white flex flex-col gap-3.5">
            <button type="button" onClick={() => setLegendOpen(v => !v)} aria-expanded={legendOpen}
              className="flex items-center justify-between gap-3 text-left lg:pointer-events-none cursor-pointer">
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{c.title(data.radius)}</span>
                <span className="text-[12px] leading-snug text-white/60 lg:hidden">{legendOpen ? c.source : rows.slice(0, 2).map(r => `${r.label} ${pctText(r.share)}`).join(' · ')}</span>
                <span className="text-[12px] leading-snug text-white/60 hidden lg:inline">{c.source}</span>
              </span>
              <span aria-hidden className={`lg:hidden text-[18px] transition-transform duration-200 ${legendOpen ? 'rotate-180' : ''}`}>⌃</span>
            </button>
            <div className={`${legendOpen ? 'flex' : 'hidden'} lg:flex flex-col gap-3.5`}>
              {group('build', c.build, 'text-[#8FD9B3]')}
              {group('nobuild', c.nobuild, 'text-[#F5C451]')}
            </div>
          </div>
          {plot && (
            <div className="absolute left-3 top-3 right-3 lg:left-auto lg:right-6 lg:top-6 lg:w-[320px] p-4 rounded-xl bg-white text-[var(--color-text)] shadow-[0_1px_2px_rgb(0_0_0/.2),0_12px_32px_rgb(0_0_0/.35)] flex flex-col gap-1">
              {picked && (
                <button type="button" onClick={() => setPicked(null)} aria-label={c.back}
                  className="absolute right-1.5 top-1.5 w-9 h-9 rounded-full flex items-center justify-center text-[18px] leading-none text-[var(--color-text-muted)] hover:bg-black/5 cursor-pointer">×</button>
              )}
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] pr-8">{picked ? c.picked : c.plot}</span>
              <span className="text-[16px] font-semibold inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-[3px] shrink-0 border border-black/10" style={{ background: (picked ? pickedColor : plot.color) ?? '#BBB' }} />
                {picked ? (pickedKind ? (ru ? pickedKind.ru : pickedKind.en) : picked) : plot.label}
              </span>
              {!picked && data.plot && (data.plot.kdb || data.plot.kdh) && <span className="text-[13px] text-[var(--color-text-muted)]">{c.rules(data.plot.kdb, data.plot.kdh)}</span>}
              {picked && <span className="text-[12px] text-[var(--color-text-muted)]">{picked}</span>}
            </div>
          )}
          <span className="hidden lg:block absolute right-6 bottom-8 px-2.5 py-1.5 rounded-lg bg-[rgb(12_16_14/0.75)] text-white text-[13px]">{c.tap}</span>
        </>
      )}
    </div>
  )
}
