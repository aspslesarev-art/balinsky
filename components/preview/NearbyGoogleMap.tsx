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

/**
 * The complex marker. A plain coloured dot disappears the moment the tourism
 * heat layer is on — the ramp runs through the same warm hues — so the complex
 * gets a photo badge in a red ring, drawn in floatPane above the overlay.
 */
function makeComplexMarker(position: { lat: number; lng: number }, title: string, photo: string | null) {
  class ComplexMarker extends google.maps.OverlayView {
    private box: HTMLDivElement | null = null

    onAdd() {
      const box = document.createElement('div')
      box.style.cssText = 'position:absolute;transform:translate(-50%,-100%);pointer-events:none;'
      box.title = title

      const badge = document.createElement('div')
      badge.style.cssText = [
        'width:52px', 'height:52px', 'border-radius:50%',
        'border:3px solid #E0383E', 'box-shadow:0 0 0 2px #fff, 0 6px 16px rgba(0,0,0,.35)',
        'background:#E0383E center/cover no-repeat', 'box-sizing:border-box',
      ].join(';')
      if (photo) badge.style.backgroundImage = `url("${photo.replace(/"/g, '%22')}")`

      // Little stem so the badge reads as "this exact spot", not "somewhere here".
      const stem = document.createElement('div')
      stem.style.cssText = [
        'width:0', 'height:0', 'margin:1px auto 0',
        'border-left:6px solid transparent', 'border-right:6px solid transparent',
        'border-top:9px solid #E0383E', 'filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))',
      ].join(';')

      box.append(badge, stem)
      this.box = box
      this.getPanes()?.floatPane.appendChild(box)
    }

    draw() {
      const point = this.getProjection()?.fromLatLngToDivPixel(new google.maps.LatLng(position.lat, position.lng))
      if (this.box && point) {
        this.box.style.left = `${point.x}px`
        this.box.style.top = `${point.y}px`
      }
    }

    onRemove() {
      this.box?.remove()
      this.box = null
    }
  }
  return new ComplexMarker()
}

export function NearbyGoogleMap({ center, pois, title, photo }: {
  center: { lat: number; lng: number }
  pois: MapPoi[]
  title: string
  photo?: string | null
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
        makeComplexMarker(center, title, photo ?? null).setMap(map)
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
  }, [apiKey, center, pois, title, photo])

  // Chip → map: recentre and lift the chosen pin.
  useEffect(() => {
    const map = mapRef.current
    const poi = pois[active]
    if (!map || !poi) return
    map.panTo({ lat: poi.lat, lng: poi.lng })
    markersRef.current.forEach((m, i) => m.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: i === active ? 8 : 6,
      fillColor: i === active ? '#b68235' : '#4a4844',
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
