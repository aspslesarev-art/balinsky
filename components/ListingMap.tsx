'use client'

// Карты в «Удобно ли там жить?» (макет «Карты», A — владелец 23.10.2026):
//   routes — линии по дорогам от объекта до аэропорта, Чангу, Убуда, Улувату
//            и Санура (listing_geo_facts.route_lines, scripts/route-lines.ts);
//   near   — объект красной точкой и места рядом цветными точками.
// Подложка — OpenFreeMap (OpenStreetMap), без ключа и без оплаты: Google за
// эти карты не платим. MapLibre грузится, только когда карта на экране.
import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'

const STYLE = 'https://tiles.openfreemap.org/styles/positron'

export type MapRoute = { key: string; color: string; label: string; line: number[][] }
export type MapPoint = { lng: number; lat: number; color: string }

export function ListingMap({ lat, lng, name, routes, points, className = 'h-[320px]' }: {
  lat: number
  lng: number
  name: string
  routes?: MapRoute[]
  points?: MapPoint[]
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
        style: STYLE,
        center,
        zoom: routes ? 9.5 : 15,
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
        const me = document.createElement('div')
        me.className = 'bx-map-me'
        new ml.Marker({ element: me }).setLngLat(center).addTo(m)
        // На карте маршрутов подписей нет: они закрывали линии, а куда сколько
        // ехать — списком под картой (владелец 23.10.2026).
        if (!routes?.length) {
          const tag = document.createElement('div')
          tag.className = 'bx-map-label'
          tag.textContent = name
          new ml.Marker({ element: tag, anchor: 'top', offset: [0, 12] }).setLngLat(center).addTo(m)
        }
        // Подпись OpenStreetMap — свёрнутой кнопкой «i»: раскрытая закрывала низ карты.
        ref.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      })
    })
    return () => { cancelled = true; map?.remove() }
  }, [lat, lng, name, routes, points])

  return <div ref={ref} className={`w-full overflow-hidden rounded-xl bg-[var(--color-search-bg)] ${className}`} role="img" aria-label={name} />
}
