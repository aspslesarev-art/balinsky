'use client'

import { useEffect, useRef, useState } from 'react'
import { BALINSKY_MAP_STYLE } from '@/lib/google-map-style'
import { loadGoogleMaps } from '@/lib/google-maps-loader'
import { createHeatOverlay, fetchHeatCells } from '@/lib/heat-overlay'
import { NearbyMap, type MapPoi } from '@/components/preview/NearbyMap'

const HEIGHT = 300
const ZOOM = 14

/**
 * Neighbourhood map on real Google Maps, with the site's own tourism heat
 * overlay — so the prototype can be judged with the services it will actually
 * ship with.
 *
 * The public Maps key is referrer-locked to balinsky.info, so on localhost and
 * on preview URLs it never renders. Rather than showing an empty grey box we
 * fall back to the plain OSM map, which is why both components exist.
 */
export function NearbyGoogleMap({ center, pois, title }: {
  center: { lat: number; lng: number }
  pois: MapPoi[]
  title: string
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''
  const [failed, setFailed] = useState(!apiKey)
  const [active, setActive] = useState(0)
  const [heat, setHeat] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const heatRef = useRef<google.maps.OverlayView | null>(null)

  useEffect(() => {
    if (!apiKey || !boxRef.current || mapRef.current) return
    let cancelled = false
    // The loader never rejects on a referrer block — it just never draws — so
    // give it a deadline and fall back rather than leaving a grey rectangle.
    const deadline = setTimeout(() => { if (!mapRef.current) setFailed(true) }, 6000)
    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !boxRef.current) return
        const map = new google.maps.Map(boxRef.current, {
          center, zoom: ZOOM, gestureHandling: 'greedy', mapTypeControl: false,
          streetViewControl: false, fullscreenControl: true, clickableIcons: false,
          styles: BALINSKY_MAP_STYLE, backgroundColor: '#F2EAD8',
        })
        new google.maps.Marker({
          position: center, map, title, zIndex: 20,
          icon: {
            path: google.maps.SymbolPath.CIRCLE, scale: 9,
            fillColor: '#b68235', fillOpacity: 1, strokeColor: '#FFFFFF', strokeWeight: 3,
          },
        })
        markersRef.current = pois.map((p, i) => {
          const m = new google.maps.Marker({
            position: { lat: p.lat, lng: p.lng }, map, title: p.name, zIndex: 10,
            icon: {
              path: google.maps.SymbolPath.CIRCLE, scale: 6,
              fillColor: '#201f1d', fillOpacity: 1, strokeColor: '#FFFFFF', strokeWeight: 2,
            },
          })
          m.addListener('click', () => setActive(i))
          return m
        })
        mapRef.current = map
        clearTimeout(deadline)
      })
      .catch(() => setFailed(true))
    return () => { cancelled = true; clearTimeout(deadline) }
  }, [apiKey, center, pois, title])

  // Chip → map: recentre and lift the chosen pin.
  useEffect(() => {
    const map = mapRef.current
    const poi = pois[active]
    if (!map || !poi) return
    map.panTo({ lat: poi.lat, lng: poi.lng })
    markersRef.current.forEach((m, i) => m.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: i === active ? 8 : 6,
      fillColor: i === active ? '#b68235' : '#201f1d',
      fillOpacity: 1, strokeColor: '#FFFFFF', strokeWeight: i === active ? 3 : 2,
    }))
  }, [active, pois])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false
    if (heat) {
      void (async () => {
        const data = await fetchHeatCells()
        if (cancelled || !data || !data.cells.length) return
        try {
          if (!heatRef.current) heatRef.current = createHeatOverlay(data.cells, data.max)
          heatRef.current.setMap(map)
        } catch { heatRef.current?.setMap(null); heatRef.current = null }
      })()
    } else {
      heatRef.current?.setMap(null)
    }
    return () => { cancelled = true }
  }, [heat])
  useEffect(() => () => { heatRef.current?.setMap(null) }, [])

  if (failed) return <NearbyMap center={center} pois={pois} />

  const focus = pois[active] ?? null

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
        {pois.map((p, i) => (
          <button
            key={p.name + i}
            type="button"
            onClick={() => setActive(i)}
            className={i === active ? '' : 'glass glass-hover'}
            style={{
              padding: '9px 16px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 14,
              border: `1px solid ${i === active ? 'var(--color-accent)' : 'var(--color-divider)'}`,
              background: i === active ? 'color-mix(in srgb, var(--color-accent-100) 80%, transparent)' : undefined,
              color: i === active ? 'var(--color-accent-800)' : 'var(--color-text)',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div style={{
        position: 'relative', marginTop: 20, height: HEIGHT, overflow: 'hidden',
        border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', background: '#F2EAD8',
      }}>
        <div ref={boxRef} style={{ position: 'absolute', inset: 0 }} />
        <button
          type="button"
          onClick={() => setHeat(h => !h)}
          className="glass"
          style={{
            position: 'absolute', top: 10, left: 10, padding: '7px 13px', borderRadius: 999,
            cursor: 'pointer', font: 'inherit', fontSize: 12, zIndex: 5,
            color: heat ? 'var(--color-accent-800)' : 'var(--color-text)',
          }}
        >
          {heat ? '● ' : '○ '}Плотность отзывов Google
        </button>
      </div>

      {focus && (
        <div style={{ marginTop: 16, padding: '18px 22px', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}>
          <div className="kicker">
            {focus.distanceM >= 1000 ? `${(focus.distanceM / 1000).toFixed(1)} км` : `${focus.distanceM} м`}
            {focus.walkMin ? ` · ${focus.walkMin} мин пешком` : ''}
            {focus.reviews ? ` · ${focus.reviews.toLocaleString('ru-RU')} отзывов` : ''}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.5 }}>
            <strong style={{ fontWeight: 500 }}>{focus.name}</strong>
            {focus.rating ? ` — рейтинг ${focus.rating}` : ''}. {focus.categoryTitle}.
          </p>
        </div>
      )}
    </div>
  )
}
