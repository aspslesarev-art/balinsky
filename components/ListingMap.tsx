'use client'

// Карты в «Удобно ли там жить?» (макет «Карты», A — владелец 23.10.2026):
//   routes — линии по дорогам от объекта до аэропорта, Чангу, Убуда, Улувату
//            и Санура (listing_geo_facts.route_lines, scripts/route-lines.ts);
//   near   — объект красной точкой и места рядом цветными точками;
//   heat   — где много мест с оценкой от 4,3 и от 50 отзывов в Google
//            (_heat_reviews.json, scripts/build-review-heat.mjs); раньше —
//            платная карта Google по кнопке.
// Подложка — OpenFreeMap (OpenStreetMap), без ключа и без оплаты: Google за
// эти карты не платим. MapLibre грузится, только когда карта на экране.
import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'

const STYLE = 'https://tiles.openfreemap.org/styles/positron'
// Вид района под углом, «как с дрона» (блок «О районе», макет B — владелец
// 23.10.2026): снимки Esri World Imagery, как у карты ветра, и рельеф
// AWS Terrain Tiles — оба бесплатно, без ключа.
const AERIAL_STYLE = {
  version: 8 as const,
  sources: {
    sat: { type: 'raster' as const, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Esri, Maxar' },
    dem: { type: 'raster-dem' as const, tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium' as const, tileSize: 256, maxzoom: 14 },
  },
  layers: [{ id: 'sat', type: 'raster' as const, source: 'sat' }],
  terrain: { source: 'dem', exaggeration: 1 },
}
const HEAT_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/competitors/_heat_reviews.json`

type HeatData = { cells: { lat: number; lng: number; weight: number }[]; max: number }
let heatCache: Promise<HeatData> | null = null
const loadHeat = () => (heatCache ??= fetch(HEAT_URL).then(r => r.ok ? r.json() as Promise<HeatData> : { cells: [], max: 1 }).catch(() => ({ cells: [], max: 1 })))

export type MapRoute = { key: string; color: string; label: string; line: number[][] }
export type MapPoint = { lng: number; lat: number; color: string }

export function ListingMap({ lat, lng, name, routes, points, heat = false, aerial = false, className = 'h-[320px]' }: {
  lat: number
  lng: number
  name: string
  routes?: MapRoute[]
  points?: MapPoint[]
  /** Слой «где бывают иностранные туристы». */
  heat?: boolean
  /** Спутник под углом, без управления — картинка района. */
  aerial?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let map: import('maplibre-gl').Map | null = null
    let cancelled = false
    import('maplibre-gl').then(({ default: ml }) => {
      if (cancelled || !ref.current) return
      const center: [number, number] = [lng, lat]
      map = new ml.Map({
        container: ref.current,
        style: aerial ? AERIAL_STYLE : STYLE,
        center,
        zoom: routes ? 9.5 : heat ? 13 : aerial ? 14.6 : 15,
        ...(aerial ? { pitch: 62, maxPitch: 85, interactive: false } : {}),
        // Колесо и один палец листают страницу, а не карту.
        cooperativeGestures: true,
        attributionControl: { compact: true },
      })
      const m = map
      m.on('load', () => {
        if (routes?.length) {
          const b = new ml.LngLatBounds(center, center)
          // Длинные снизу, короткие сверху: до аэропорта и в Улувату дорога общая,
          // и короткий маршрут иначе прятался под длинным.
          const len = (l: number[][]) => l.reduce((d, c, i) => i ? d + Math.hypot(c[0] - l[i - 1][0], c[1] - l[i - 1][1]) : 0, 0)
          for (const r of [...routes].sort((a, b) => len(b.line) - len(a.line))) {
            r.line.forEach(c => b.extend(c as [number, number]))
            // Префикс bx-: в стиле подложки уже есть слой «airport».
            const id = `bx-route-${r.key}`
            m.addSource(id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r.line } } })
            m.addLayer({ id: `${id}-casing`, type: 'line', source: id, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 7 } })
            m.addLayer({ id, type: 'line', source: id, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': r.color, 'line-width': 4 } })
          }
          m.fitBounds(b, { padding: 32, animate: false })
        }
        if (points?.length) {
          m.addSource('bx-pts', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: points.map(p => ({ type: 'Feature', properties: { c: p.color }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })) },
          })
          m.addLayer({ id: 'bx-pts', type: 'circle', source: 'bx-pts', paint: { 'circle-radius': 5, 'circle-color': ['get', 'c'], 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5 } })
        }
        if (heat) {
          loadHeat().then(({ cells, max }) => {
            if (!cells.length || !m.getStyle()) return
            m.addSource('bx-heat', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: cells.map(c => ({ type: 'Feature', properties: { w: c.weight / max }, geometry: { type: 'Point', coordinates: [c.lng, c.lat] } })) },
            })
            m.addLayer({
              id: 'bx-heat', type: 'heatmap', source: 'bx-heat',
              paint: {
                'heatmap-weight': ['get', 'w'],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 13, 45, 16, 90],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 2.5],
                // Тепловизор: редкое — голубым, среднее — жёлтым, плотное — оранжевым
                // (макет «Карта иностранных туристов: цвета», B — владелец 23.10.2026).
                'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(80,140,255,0)', 0.12, 'rgba(80,160,255,0.35)', 0.35, 'rgba(90,210,200,0.45)', 0.55, 'rgba(255,220,90,0.6)', 0.8, 'rgba(255,160,40,0.75)', 1, 'rgba(245,101,20,0.85)'],
              },
            })
          }).catch(() => {})
        }
        const me = document.createElement('div')
        me.className = 'bx-map-me'
        new ml.Marker({ element: me }).setLngLat(center).addTo(m)
        // Объект — только красной точкой, без подписи: она закрывала маршруты
        // и точки вокруг (владелец 23.10.2026).
        // Подпись OpenStreetMap — свёрнутой кнопкой «i»: раскрытая закрывала низ карты.
        ref.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      })
    })
    return () => { cancelled = true; map?.remove() }
  }, [lat, lng, name, routes, points, heat, aerial])

  return <div ref={ref} className={`w-full overflow-hidden rounded-xl bg-[var(--color-search-bg)] ${className}`} role="img" aria-label={name} />
}
