'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer'
import { X } from 'lucide-react'
import { BALINSKY_MAP_STYLE } from '@/lib/google-map-style'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'

export type VillaPoint = {
  id: string
  slug: string
  title: string
  priceUsd: number | null
  thumb: string | null
  lat: number
  lng: number
}

const BALI_CENTER = { lat: -8.4, lng: 115.15 }
const BALI_DEFAULT_ZOOM = 10
const SINGLE_POINT_ZOOM = 15

const COLORS = {
  primary: '#33A474',
  primaryHover: '#2C8E65',
  selected: '#1F3B2F',
  white: '#FFFFFF',
}


function pinSvg({ bg, size = 32, ring }: { bg: string; size?: number; ring?: string }): string {
  const half = size / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="black" flood-opacity="0.18"/>
      </filter>
    </defs>
    ${ring ? `<circle cx="${half}" cy="${half}" r="${half - 1}" fill="none" stroke="${ring}" stroke-width="2.5"/>` : ''}
    <circle cx="${half}" cy="${half}" r="${half - 5}" fill="${bg}" filter="url(#s)"/>
    <circle cx="${half}" cy="${half}" r="3.5" fill="${COLORS.white}"/>
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}
function clusterIconSvg(count: number, size: number, bg: string): string {
  const half = size / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><filter id="cs" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.18"/></filter></defs>
    <circle cx="${half}" cy="${half}" r="${half - 2}" fill="${bg}" filter="url(#cs)"/>
    <text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, system-ui, sans-serif" font-size="${count >= 100 ? size * 0.32 : size * 0.4}" font-weight="700" fill="${COLORS.white}">${count}</text>
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}
const clusterRenderer: Renderer = {
  render: ({ count, position }) => {
    let size = 32
    let bg = COLORS.primary
    if (count >= 20) { size = 48; bg = COLORS.selected }
    else if (count >= 5) { size = 40; bg = COLORS.primaryHover }
    return new google.maps.Marker({
      position,
      icon: {
        url: clusterIconSvg(count, size, bg),
        size: new google.maps.Size(size, size),
        anchor: new google.maps.Point(size / 2, size / 2),
        scaledSize: new google.maps.Size(size, size),
      },
      zIndex: 1000 + count,
    })
  },
}
function makeIcon(opts: { selected?: boolean; hover?: boolean }) {
  const base = 32
  const size = opts.selected ? base + 6 : opts.hover ? base + 4 : base
  const bg = opts.selected ? COLORS.selected : opts.hover ? COLORS.primaryHover : COLORS.primary
  const ring = opts.selected ? COLORS.primary : undefined
  return {
    url: pinSvg({ bg, size, ring }),
    size: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
    scaledSize: new google.maps.Size(size, size),
  }
}
function MapMarkers({ points, selectedId, onSelect }: { points: VillaPoint[]; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const map = useMap()
  const markersRef = useRef<Map<string, google.maps.Marker> | null>(null)
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const pointsKey = points.map(p => p.id).join('|')

  useEffect(() => {
    if (!map) return
    clustererRef.current?.clearMarkers()
    clustererRef.current = null
    if (markersRef.current) for (const m of markersRef.current.values()) m.setMap(null)
    const map2 = new globalThis.Map<string, google.maps.Marker>()
    for (const p of points) {
      const marker = new google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, icon: makeIcon({}), cursor: 'pointer' })
      marker.addListener('click', () => onSelect(p.id))
      marker.addListener('mouseover', () => { if (p.id !== selectedId) marker.setIcon(makeIcon({ hover: true })) })
      marker.addListener('mouseout', () => { if (p.id !== selectedId) marker.setIcon(makeIcon({})) })
      map2.set(p.id, marker)
    }
    markersRef.current = map2
    clustererRef.current = new MarkerClusterer({ map, markers: [...map2.values()], renderer: clusterRenderer })
    return () => {
      clustererRef.current?.clearMarkers()
      clustererRef.current = null
      for (const m of map2.values()) m.setMap(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointsKey])

  useEffect(() => {
    const m = markersRef.current
    if (!m) return
    for (const [id, marker] of m.entries()) {
      marker.setIcon(makeIcon({ selected: id === selectedId }))
      marker.setZIndex(id === selectedId ? 9999 : undefined)
    }
  }, [selectedId])

  useEffect(() => {
    if (!map) return
    if (points.length === 0) { map.setCenter(BALI_CENTER); map.setZoom(BALI_DEFAULT_ZOOM); return }
    if (points.length === 1) { map.setCenter({ lat: points[0].lat, lng: points[0].lng }); map.setZoom(SINGLE_POINT_ZOOM); return }
    const bounds = new google.maps.LatLngBounds()
    for (const p of points) bounds.extend({ lat: p.lat, lng: p.lng })
    map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointsKey])

  return null
}

function PopupCard({ p, onClose, lang }: { p: VillaPoint; onClose: () => void; lang: 'ru' | 'en' }) {
  const { currency } = useCurrency()
  const price = p.priceUsd != null && Number.isFinite(p.priceUsd) ? formatPrice(p.priceUsd, currency) : null
  return (
    <div className="relative w-[260px] p-1">
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-[#6B7280] hover:text-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.12)] z-10"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
      {p.thumb ? (
        <img src={p.thumb} alt={p.title} className="w-full h-[140px] object-cover rounded-xl mb-3" />
      ) : (
        <div className="w-full h-[140px] rounded-xl mb-3 bg-[#F1F5F1] flex items-center justify-center text-3xl">🏝️</div>
      )}
      <div className="text-[14px] font-semibold leading-snug mb-1.5 line-clamp-2 text-[#111827] pr-6">{p.title}</div>
      {price && (
        <div className="text-[15px] font-semibold text-[#2C8E65] mb-3">{price}</div>
      )}
      <a
        href={lang === 'en' ? `/en/villas/o/${p.slug}` : `/ru/villy/o/${p.slug}`}
        className="block text-center w-full px-3 py-2 rounded-lg bg-[#33A474] hover:bg-[#2C8E65] text-white text-[13px] font-medium no-underline transition-colors"
      >
        {lang === 'en' ? 'Open listing' : 'Открыть карточку'}
      </a>
    </div>
  )
}

export function VillasMap({
  apiKey,
  points,
  heightClass = 'h-[calc(100vh_-_280px)] min-h-[480px]',
  lang = 'ru',
}: {
  apiKey: string
  points: VillaPoint[]
  heightClass?: string
  lang?: 'ru' | 'en'
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => points.find(p => p.id === selectedId) ?? null, [points, selectedId])

  if (!apiKey) {
    return (
      <div style={{ width: '100%' }} className={`${heightClass} bg-[var(--color-search-bg)] rounded-3xl flex items-center justify-center text-[var(--color-text-muted)]`}>
        {lang === 'en' ? 'Map unavailable (no API key)' : 'Карта недоступна (нет API ключа)'}
      </div>
    )
  }

  return (
    <div
      style={{ width: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' }}
      className={`${heightClass} bg-white rounded-3xl overflow-hidden border border-[var(--color-border)]`}
    >
      <APIProvider apiKey={apiKey} language={lang}>
        <Map
          defaultCenter={BALI_CENTER}
          defaultZoom={BALI_DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={true}
          // Keep Street View pegman + fullscreen, ditch Map/Satellite type
          // toggle and zoom buttons — the styled Bali map doesn't need a
          // satellite swap and the controls were just visual noise.
          streetViewControl={true}
          fullscreenControl={true}
          mapTypeControl={false}
          zoomControl={false}
          clickableIcons={false}
          styles={BALINSKY_MAP_STYLE}
          backgroundColor="#F2EAD8"
        >
          <MapMarkers points={points} selectedId={selectedId} onSelect={id => setSelectedId(prev => (prev === id ? null : id))} />
          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelectedId(null)}
              pixelOffset={[0, -28]}
              headerDisabled
            >
              <PopupCard p={selected} onClose={() => setSelectedId(null)} lang={lang} />
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  )
}
