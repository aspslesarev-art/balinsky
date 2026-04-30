'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import { BALINSKY_MAP_STYLE } from '@/lib/google-map-style'
import type { Snapshot } from './types'

const COLORS = {
  villa: '#E0383E',
  villaRing: '#FFFFFF',
  comp: '#3B82F6',
  compHover: '#1D4ED8',
  anchor: '#16A34A',
  zone: '#E0383E',
}

function pinSvg({ bg, size, ring, label }: { bg: string; size: number; ring?: string; label?: string }): string {
  const half = size / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="black" flood-opacity="0.22"/></filter></defs>
    ${ring ? `<circle cx="${half}" cy="${half}" r="${half - 1}" fill="${ring}"/>` : ''}
    <circle cx="${half}" cy="${half}" r="${half - (ring ? 4 : 2)}" fill="${bg}" filter="url(#s)"/>
    ${label ? `<text x="${half}" y="${half + 1}" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, system-ui, sans-serif" font-size="${size * 0.36}" font-weight="700" fill="#FFFFFF">${label}</text>` : `<circle cx="${half}" cy="${half}" r="3" fill="#FFFFFF"/>`}
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

function priceLabel(adr: number): string {
  if (adr >= 1000) return Math.round(adr / 100) / 10 + 'k'
  return String(Math.round(adr))
}

function MapLayer({ snap, showAllPois, allPois }: { snap: Snapshot; showAllPois: boolean; allPois: { lat: number; lng: number; name: string | null; category: string }[] }) {
  const map = useMap()
  const ref = useRef<{ markers: google.maps.Marker[]; circles: google.maps.Circle[] }>({ markers: [], circles: [] })
  const fitOnceRef = useRef(false)

  useEffect(() => {
    if (!map) return
    for (const m of ref.current.markers) m.setMap(null)
    for (const c of ref.current.circles) c.setMap(null)
    ref.current = { markers: [], circles: [] }

    // Villa pin (red, large)
    const villaSize = 44
    const villaMarker = new google.maps.Marker({
      map,
      position: { lat: snap.villa.lat, lng: snap.villa.lng },
      icon: {
        url: pinSvg({ bg: COLORS.villa, size: villaSize, ring: COLORS.villaRing }),
        size: new google.maps.Size(villaSize, villaSize),
        anchor: new google.maps.Point(villaSize / 2, villaSize / 2),
        scaledSize: new google.maps.Size(villaSize, villaSize),
      },
      zIndex: 999999,
      title: snap.villa.title,
    })
    ref.current.markers.push(villaMarker)

    // Zone circles
    for (const r of [100, 500, 1500]) {
      const c = new google.maps.Circle({
        map,
        center: { lat: snap.villa.lat, lng: snap.villa.lng },
        radius: r,
        fillOpacity: 0,
        strokeColor: COLORS.zone,
        strokeOpacity: 0.25,
        strokeWeight: 1,
        clickable: false,
      })
      ref.current.circles.push(c)
    }

    // Все Booking-объекты в радиусе (mapCompetitors). Матчи — крупные с цифрой, остальные — мелкие точки.
    for (const c of snap.mapCompetitors) {
      const size = c.isMatch ? 32 : 16
      const icon = c.isMatch
        ? {
            url: pinSvg({ bg: COLORS.comp, size, label: priceLabel(c.adr) }),
            size: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
            scaledSize: new google.maps.Size(size, size),
          }
        : {
            url: pinSvg({ bg: COLORS.comp, size }),
            size: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
            scaledSize: new google.maps.Size(size, size),
          }
      const m = new google.maps.Marker({
        map,
        position: { lat: c.lat, lng: c.lng },
        icon,
        opacity: c.isMatch ? 1 : 0.75,
        zIndex: c.isMatch ? 100 : 10,
        title: `Booking: ${c.adr} $/ночь${c.bedrooms != null ? ` · ${c.bedrooms} BR` : ''}`,
      })
      ref.current.markers.push(m)
    }

    // Anchor POIs (green) — show always
    for (const a of snap.anchors) {
      const size = 24
      const m = new google.maps.Marker({
        map,
        position: { lat: a.lat, lng: a.lng },
        icon: {
          url: pinSvg({ bg: COLORS.anchor, size }),
          size: new google.maps.Size(size, size),
          anchor: new google.maps.Point(size / 2, size / 2),
          scaledSize: new google.maps.Size(size, size),
        },
        title: a.name ?? 'POI',
      })
      ref.current.markers.push(m)
    }

    // All POIs in showAll mode
    if (showAllPois) {
      const seen = new Set(snap.anchors.map(a => `${a.lat.toFixed(5)},${a.lng.toFixed(5)}`))
      for (const p of allPois) {
        const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`
        if (seen.has(key)) continue
        const size = 16
        const m = new google.maps.Marker({
          map,
          position: { lat: p.lat, lng: p.lng },
          icon: {
            url: pinSvg({ bg: COLORS.anchor, size }),
            size: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
            scaledSize: new google.maps.Size(size, size),
          },
          opacity: 0.7,
          title: p.name ?? 'POI',
        })
        ref.current.markers.push(m)
      }
    }

    if (!fitOnceRef.current) {
      fitOnceRef.current = true
      const bounds = new google.maps.LatLngBounds()
      bounds.extend({ lat: snap.villa.lat, lng: snap.villa.lng })
      const offset = 0.012
      bounds.extend({ lat: snap.villa.lat + offset, lng: snap.villa.lng + offset })
      bounds.extend({ lat: snap.villa.lat - offset, lng: snap.villa.lng - offset })
      for (const c of snap.mapCompetitors.slice(0, 50)) bounds.extend({ lat: c.lat, lng: c.lng })
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 })
    }

    return () => {
      for (const m of ref.current.markers) m.setMap(null)
      for (const c of ref.current.circles) c.setMap(null)
    }
  }, [map, snap, showAllPois, allPois])

  return null
}

export function InvestmentMap({
  apiKey,
  snap,
  allPois,
  heightClass = 'h-[480px]',
}: {
  apiKey: string
  snap: Snapshot
  allPois: { lat: number; lng: number; name: string | null; category: string }[]
  heightClass?: string
}) {
  const [showAllPois, setShowAllPois] = useState(false)

  if (!apiKey) {
    return <div className={`${heightClass} bg-[var(--color-search-bg)] rounded-3xl flex items-center justify-center text-[var(--color-text-muted)]`}>Карта недоступна</div>
  }

  return (
    <div className={`relative ${heightClass} bg-white rounded-3xl overflow-hidden border border-[var(--color-border)]`}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={{ lat: snap.villa.lat, lng: snap.villa.lng }}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={false}
          clickableIcons={false}
          styles={BALINSKY_MAP_STYLE}
          backgroundColor="#F2EAD8"
        >
          <MapLayer snap={snap} showAllPois={showAllPois} allPois={allPois} />
        </Map>
      </APIProvider>

      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] px-3 py-2 text-[12px] flex items-center gap-3 shadow-sm">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E0383E]" /> Вилла</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Конкуренты</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" /> Якоря</span>
      </div>
      <button
        type="button"
        onClick={() => setShowAllPois(v => !v)}
        className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[12px] font-medium hover:border-[var(--color-primary)] cursor-pointer shadow-sm"
      >
        {showAllPois ? 'Только якоря' : 'Все POI'}
      </button>
    </div>
  )
}
