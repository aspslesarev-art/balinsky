'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  APIProvider,
  Map,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps'
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer'
import { X } from 'lucide-react'
import { BALINSKY_MAP_STYLE } from '@/lib/google-map-style'

export type ComplexPoint = {
  id: string
  slug: string
  name: string
  location: string | null
  types: string | null
  coverUrl: string | null
}

// Several complexes can share the same lat/lng (adjacent buildings under
// one address, or editor data entered with the same coords). Grouping at
// build time means the marker click always shows every listing pinned to
// that spot rather than letting the clusterer hide them at max zoom.
export type ComplexPointGroup = { key: string; lat: number; lng: number; items: ComplexPoint[] }

const BALI_CENTER = { lat: -8.4, lng: 115.15 }
const BALI_DEFAULT_ZOOM = 10
const SINGLE_POINT_ZOOM = 15

const COLORS = {
  primary: '#33A474',
  primaryHover: '#2C8E65',
  primaryPressed: '#257754',
  selected: '#1F3B2F',
  white: '#FFFFFF',
}


function clusterIconSvg(count: number, size: number, bg: string): string {
  const half = size / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <filter id="cs" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.18"/>
      </filter>
    </defs>
    <circle cx="${half}" cy="${half}" r="${half - 2}" fill="${bg}" filter="url(#cs)"/>
    <text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="central"
          font-family="-apple-system, system-ui, sans-serif" font-size="${count >= 100 ? size * 0.32 : size * 0.4}"
          font-weight="700" fill="${COLORS.white}">${count}</text>
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

const clusterRenderer: Renderer = {
  render: ({ count, position }) => {
    let size = 32
    let bg = COLORS.primary
    if (count >= 20) {
      size = 48
      bg = COLORS.selected
    } else if (count >= 5) {
      size = 40
      bg = COLORS.primaryHover
    }
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

function pinSvgWithCount({ bg, size = 32, ring, count }: { bg: string; size?: number; ring?: string; count?: number }): string {
  const half = size / 2
  const center = count && count > 1
    ? `<text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, system-ui, sans-serif" font-size="${size * 0.4}" font-weight="700" fill="${COLORS.white}">${count}</text>`
    : `<circle cx="${half}" cy="${half}" r="3.5" fill="${COLORS.white}"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="black" flood-opacity="0.18"/>
      </filter>
    </defs>
    ${ring ? `<circle cx="${half}" cy="${half}" r="${half - 1}" fill="none" stroke="${ring}" stroke-width="2.5"/>` : ''}
    <circle cx="${half}" cy="${half}" r="${half - 5}" fill="${bg}" filter="url(#s)"/>
    ${center}
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

function makeIcon(opts: { selected?: boolean; hover?: boolean; count?: number }) {
  const base = 32
  const size = opts.selected ? base + 6 : opts.hover ? base + 4 : base
  const bg = opts.selected ? COLORS.selected : opts.hover ? COLORS.primaryHover : COLORS.primary
  const ring = opts.selected ? COLORS.primary : undefined
  return {
    url: pinSvgWithCount({ bg, size, ring, count: opts.count }),
    size: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
    scaledSize: new google.maps.Size(size, size),
  }
}

function MapMarkers({
  groups,
  selectedKey,
  onSelect,
}: {
  groups: ComplexPointGroup[]
  selectedKey: string | null
  onSelect: (key: string | null) => void
}) {
  const map = useMap()
  const markersRef = useRef<Map<string, google.maps.Marker> | null>(null)
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const groupsKey = groups.map(g => g.key).join('|')

  useEffect(() => {
    if (!map) return
    clustererRef.current?.clearMarkers()
    clustererRef.current = null
    if (markersRef.current) {
      for (const m of markersRef.current.values()) m.setMap(null)
    }
    const map2 = new globalThis.Map<string, google.maps.Marker>()
    for (const g of groups) {
      const count = g.items.length
      const marker = new google.maps.Marker({
        position: { lat: g.lat, lng: g.lng },
        icon: makeIcon({ count }),
        cursor: 'pointer',
      })
      marker.addListener('click', () => onSelect(g.key))
      marker.addListener('mouseover', () => {
        if (g.key !== selectedKey) marker.setIcon(makeIcon({ hover: true, count }))
      })
      marker.addListener('mouseout', () => {
        if (g.key !== selectedKey) marker.setIcon(makeIcon({ count }))
      })
      map2.set(g.key, marker)
    }
    markersRef.current = map2
    clustererRef.current = new MarkerClusterer({
      map,
      markers: [...map2.values()],
      renderer: clusterRenderer,
    })
    return () => {
      clustererRef.current?.clearMarkers()
      clustererRef.current = null
      for (const m of map2.values()) m.setMap(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, groupsKey])

  useEffect(() => {
    const m = markersRef.current
    if (!m) return
    for (const [key, marker] of m.entries()) {
      const g = groups.find(gg => gg.key === key)
      const count = g?.items.length ?? 1
      marker.setIcon(makeIcon({ selected: key === selectedKey, count }))
      marker.setZIndex(key === selectedKey ? 9999 : undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, groupsKey])

  useEffect(() => {
    if (!map) return
    if (groups.length === 0) {
      map.setCenter(BALI_CENTER)
      map.setZoom(BALI_DEFAULT_ZOOM)
      return
    }
    if (groups.length === 1) {
      map.setCenter({ lat: groups[0].lat, lng: groups[0].lng })
      map.setZoom(SINGLE_POINT_ZOOM)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    for (const g of groups) bounds.extend({ lat: g.lat, lng: g.lng })
    map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, groupsKey])

  return null
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-[#6B7280] hover:text-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.12)] z-10"
    >
      <X size={14} strokeWidth={2.5} />
    </button>
  )
}

function SinglePopup({ p, onClose, lang }: { p: ComplexPoint; onClose: () => void; lang: 'ru' | 'en' }) {
  return (
    <div className="relative w-[280px] p-1">
      <CloseButton onClose={onClose} />
      {p.coverUrl ? (
        <img src={p.coverUrl} alt={p.name} className="w-full h-[150px] object-cover rounded-xl mb-3" />
      ) : (
        <div className="w-full h-[150px] rounded-xl mb-3 bg-[#F1F5F1] flex items-center justify-center text-3xl">🏝️</div>
      )}
      <div className="text-[15px] font-semibold leading-snug mb-1.5 line-clamp-2 text-[#111827] pr-6">{p.name}</div>
      <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-3">
        {p.location && <span>{p.location}</span>}
        {p.location && p.types && <span>·</span>}
        {p.types && <span className="line-clamp-1">{p.types}</span>}
      </div>
      <a
        href={lang === 'en' ? `/en/complexes/o/${p.slug}` : `/ru/zhilye-kompleksy/o/${p.slug}`}
        className="block text-center w-full px-3 py-2 rounded-lg bg-[#33A474] hover:bg-[#2C8E65] text-white text-[13px] font-medium no-underline transition-colors"
      >
        {lang === 'en' ? 'Open listing' : 'Открыть карточку'}
      </a>
    </div>
  )
}

function MultiPopup({ items, onClose, lang }: { items: ComplexPoint[]; onClose: () => void; lang: 'ru' | 'en' }) {
  return (
    <div className="relative w-[300px] p-1">
      <CloseButton onClose={onClose} />
      <div className="text-[13px] font-medium text-[#6B7280] mb-2 pr-6">
        {lang === 'en' ? `${items.length} complexes at this point` : `${items.length} комплексов в одной точке`}
      </div>
      <ul className="max-h-[340px] overflow-y-auto -mx-1 px-1 divide-y divide-[#E5E7EB]">
        {items.map(p => (
          <li key={p.id}>
            <a
              href={lang === 'en' ? `/en/complexes/o/${p.slug}` : `/ru/zhilye-kompleksy/o/${p.slug}`}
              className="flex items-center gap-3 py-2.5 no-underline text-[#111827] hover:bg-[#F8FAF8] rounded-md px-1"
            >
              {p.coverUrl ? (
                <img src={p.coverUrl} alt="" className="w-12 h-12 object-cover rounded-md shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-[#F1F5F1] rounded-md shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-tight line-clamp-2">{p.name}</div>
                {(p.location || p.types) && (
                  <div className="text-[12px] text-[#6B7280] mt-0.5 line-clamp-1">
                    {p.location}{p.location && p.types ? ' · ' : ''}{p.types}
                  </div>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ComplexesMap({
  apiKey,
  groups,
  heightClass = 'h-[calc(100vh_-_280px)] min-h-[480px]',
  lang = 'ru',
}: {
  apiKey: string
  groups: ComplexPointGroup[]
  heightClass?: string
  lang?: 'ru' | 'en'
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = useMemo(
    () => groups.find(g => g.key === selectedKey) ?? null,
    [groups, selectedKey],
  )

  if (!apiKey) {
    return (
      <div
        style={{ width: '100%' }}
        className={`${heightClass} bg-[var(--color-search-bg)] rounded-3xl flex items-center justify-center text-[var(--color-text-muted)]`}
      >
        {lang === 'en' ? 'Map unavailable (no API key)' : 'Карта недоступна (нет API ключа)'}
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
      }}
      className={`${heightClass} bg-white rounded-3xl overflow-hidden border border-[var(--color-border)]`}
    >
      <APIProvider apiKey={apiKey} language={lang}>
        <Map
          defaultCenter={BALI_CENTER}
          defaultZoom={BALI_DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={true}
          streetViewControl={true}
          fullscreenControl={true}
          mapTypeControl={false}
          zoomControl={false}
          clickableIcons={false}
          styles={BALINSKY_MAP_STYLE}
          backgroundColor="#F2EAD8"
        >
          <MapMarkers
            groups={groups}
            selectedKey={selectedKey}
            onSelect={k => setSelectedKey(prev => (prev === k ? null : k))}
          />

          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelectedKey(null)}
              pixelOffset={[0, -28]}
              headerDisabled
            >
              {selected.items.length === 1 ? (
                <SinglePopup p={selected.items[0]} onClose={() => setSelectedKey(null)} lang={lang} />
              ) : (
                <MultiPopup items={selected.items} onClose={() => setSelectedKey(null)} lang={lang} />
              )}
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  )
}
