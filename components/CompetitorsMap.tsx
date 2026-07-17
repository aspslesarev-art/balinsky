'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { X, Star } from 'lucide-react'
import { BALINSKY_MAP_STYLE } from '@/lib/google-map-style'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'

export type CompetitorUnit = {
  id: string
  name: string
  price: number
  bedrooms: number | null
  area: number | null
  url: string | null
}

export type CompetitorPoint = {
  id: string
  complex: string | null
  address: string | null
  lat: number
  lng: number
  rating: number | null
  reviews: number | null
  photo: string | null
  url: string | null
  distanceKm: number
  unitCount: number
  priceMin: number
  priceMax: number
  priceMedian: number
  units: CompetitorUnit[]
}

const COLORS = {
  villa: '#E0383E',
  villaRing: '#FFFFFF',
  competitor: '#3B82F6',
  competitorHover: '#1D4ED8',
  competitorSelected: '#1E3A8A',
  white: '#FFFFFF',
}


function pinSvg({ bg, size = 28, ring }: { bg: string; size?: number; ring?: string }): string {
  const half = size / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="black" flood-opacity="0.22"/></filter></defs>
    ${ring ? `<circle cx="${half}" cy="${half}" r="${half - 1}" fill="${ring}" />` : ''}
    <circle cx="${half}" cy="${half}" r="${half - 4}" fill="${bg}" filter="url(#s)"/>
    <circle cx="${half}" cy="${half}" r="3" fill="${COLORS.white}"/>
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

function pinWithCountSvg({ bg, size, count }: { bg: string; size: number; count: number }): string {
  const half = size / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><filter id="s2" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="black" flood-opacity="0.22"/></filter></defs>
    <circle cx="${half}" cy="${half}" r="${half - 2}" fill="${bg}" filter="url(#s2)"/>
    <text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, system-ui, sans-serif" font-size="${size * (count >= 100 ? 0.34 : count >= 10 ? 0.42 : 0.5)}" font-weight="700" fill="${COLORS.white}">${count}</text>
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

function makeCompetitorIcon(opts: { selected?: boolean; hover?: boolean; count?: number }) {
  const count = opts.count ?? 1
  const base = count >= 5 ? 30 : count >= 2 ? 26 : 24
  const size = opts.selected ? base + 6 : opts.hover ? base + 4 : base
  const bg = opts.selected ? COLORS.competitorSelected : opts.hover ? COLORS.competitorHover : COLORS.competitor
  const url = count > 1 ? pinWithCountSvg({ bg, size, count }) : pinSvg({ bg, size })
  return {
    url,
    size: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
    scaledSize: new google.maps.Size(size, size),
  }
}

function makeVillaIcon() {
  const size = 44
  return {
    url: pinSvg({ bg: COLORS.villa, size, ring: COLORS.villaRing }),
    size: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
    scaledSize: new google.maps.Size(size, size),
  }
}

function MapLayer({
  villa,
  competitors,
  radiusKm,
  selectedId,
  onSelect,
}: {
  villa: { lat: number; lng: number; title: string }
  competitors: CompetitorPoint[]
  radiusKm: number
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const map = useMap()
  const villaMarkerRef = useRef<google.maps.Marker | null>(null)
  const circleRef = useRef<google.maps.Circle | null>(null)
  const markersRef = useRef<globalThis.Map<string, google.maps.Marker> | null>(null)
  const fitOnceRef = useRef(false)
  const pointsKey = competitors.map(c => c.id).join('|')

  useEffect(() => {
    if (!map) return
    villaMarkerRef.current?.setMap(null)
    villaMarkerRef.current = new google.maps.Marker({
      position: { lat: villa.lat, lng: villa.lng },
      icon: makeVillaIcon(),
      zIndex: 99999,
      title: villa.title,
    })
    villaMarkerRef.current.setMap(map)

    circleRef.current?.setMap(null)
    circleRef.current = new google.maps.Circle({
      map,
      center: { lat: villa.lat, lng: villa.lng },
      radius: radiusKm * 1000,
      fillColor: COLORS.villa,
      fillOpacity: 0.06,
      strokeColor: COLORS.villa,
      strokeOpacity: 0.45,
      strokeWeight: 1.5,
      clickable: false,
    })

    return () => {
      villaMarkerRef.current?.setMap(null)
      circleRef.current?.setMap(null)
    }
  }, [map, villa.lat, villa.lng, villa.title, radiusKm])

  useEffect(() => {
    if (!map) return
    if (markersRef.current) for (const m of markersRef.current.values()) m.setMap(null)
    const map2 = new globalThis.Map<string, google.maps.Marker>()
    for (const p of competitors) {
      const count = p.unitCount
      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        icon: makeCompetitorIcon({ count }),
        cursor: 'pointer',
        map,
      })
      marker.addListener('click', () => onSelect(p.id))
      marker.addListener('mouseover', () => { if (p.id !== selectedId) marker.setIcon(makeCompetitorIcon({ hover: true, count })) })
      marker.addListener('mouseout', () => { if (p.id !== selectedId) marker.setIcon(makeCompetitorIcon({ count })) })
      map2.set(p.id, marker)
    }
    markersRef.current = map2

    if (!fitOnceRef.current) {
      fitOnceRef.current = true
      const bounds = new google.maps.LatLngBounds()
      bounds.extend({ lat: villa.lat, lng: villa.lng })
      const offsetLat = radiusKm / 111
      const offsetLng = radiusKm / (111 * Math.cos((villa.lat * Math.PI) / 180))
      bounds.extend({ lat: villa.lat + offsetLat, lng: villa.lng + offsetLng })
      bounds.extend({ lat: villa.lat - offsetLat, lng: villa.lng - offsetLng })
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 })
    }

    return () => { for (const m of map2.values()) m.setMap(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointsKey])

  useEffect(() => {
    const m = markersRef.current
    if (!m) return
    const byId = new globalThis.Map(competitors.map(c => [c.id, c.unitCount]))
    for (const [id, marker] of m.entries()) {
      marker.setIcon(makeCompetitorIcon({ selected: id === selectedId, count: byId.get(id) ?? 1 }))
      marker.setZIndex(id === selectedId ? 9999 : undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return null
}

function PopupCard({ p, onClose }: { p: CompetitorPoint; onClose: () => void }) {
  const { currency } = useCurrency()
  const fmt = (n: number) => formatPrice(n, currency)
  const titleText = p.complex || (p.units[0]?.name ?? 'Объект на Booking')
  const priceLabel = p.priceMin === p.priceMax
    ? fmt(p.priceMin)
    : `${fmt(p.priceMin)} – ${fmt(p.priceMax)}`
  return (
    <div className="relative w-[280px] p-1">
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-[#6B7280] hover:text-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.12)] z-10"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- map InfoWindow popup, not a Next image
        <img src={p.photo} alt={titleText} className="w-full h-[140px] object-cover rounded-xl mb-3" />
      ) : (
        <div className="w-full h-[140px] rounded-xl mb-3 bg-[#EFF4FB] flex items-center justify-center text-3xl">🏨</div>
      )}
      <div className="text-[11px] uppercase tracking-wide text-[#6B7280] mb-1 font-medium">Booking.com</div>
      <div className="text-[14px] font-semibold leading-snug mb-1.5 line-clamp-2 text-[#111827] pr-6">
        {titleText}
      </div>
      {p.rating != null && (
        <div className="flex items-center gap-1 text-[12px] text-[#6B7280] mb-2">
          <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
          <span className="font-medium text-[#111827]">{p.rating.toFixed(1)}</span>
          {p.reviews != null && <span>· {p.reviews} отзывов</span>}
        </div>
      )}
      <div className="text-[15px] font-semibold text-[#1D4ED8] mb-1">{priceLabel} <span className="text-[12px] font-normal text-[#6B7280]">/ ночь</span></div>
      <div className="flex items-center gap-3 text-[12px] text-[#6B7280] mb-3">
        <span>{p.unitCount > 1 ? `${p.unitCount} вариантов` : '1 вариант'}</span>
        <span>{p.distanceKm.toFixed(1)} км</span>
      </div>
      {p.unitCount > 1 && (
        <div className="mb-3 max-h-[140px] overflow-y-auto rounded-lg border border-[#E5E7EB] divide-y divide-[#F1F3F5]">
          {p.units.map(u => (
            <a
              key={u.id}
              href={u.url ?? '#'}
              target={u.url ? '_blank' : undefined}
              rel={u.url ? 'noopener noreferrer nofollow' : undefined}
              className={`flex items-center justify-between gap-2 px-3 py-2 text-[12px] no-underline ${u.url ? 'hover:bg-[#F8FAFB]' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[#111827]">{u.name}</div>
                <div className="text-[11px] text-[#6B7280]">
                  {u.bedrooms != null ? `${u.bedrooms} BR` : ''}
                  {u.bedrooms != null && u.area != null ? ' · ' : ''}
                  {u.area != null ? `${u.area} м²` : ''}
                </div>
              </div>
              <div className="text-[13px] font-semibold text-[#1D4ED8] shrink-0">{fmt(u.price)}</div>
            </a>
          ))}
        </div>
      )}
      {p.url && (
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="block text-center w-full px-3 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E3A8A] text-white text-[13px] font-medium no-underline transition-colors"
        >
          Открыть на Booking
        </a>
      )}
    </div>
  )
}

export function CompetitorsMap({
  apiKey,
  villa,
  competitors,
  radiusKm = 2,
  heightClass = 'h-[460px]',
}: {
  apiKey: string
  villa: { lat: number; lng: number; title: string }
  competitors: CompetitorPoint[]
  radiusKm?: number
  heightClass?: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => competitors.find(p => p.id === selectedId) ?? null, [competitors, selectedId])

  if (!apiKey) {
    return (
      <div className={`${heightClass} bg-[var(--color-search-bg)] rounded-3xl flex items-center justify-center text-[var(--color-text-muted)]`} data-llm-skip="">
        Карта недоступна (нет API ключа)
      </div>
    )
  }

  return (
    <div
      data-llm-skip=""
      style={{ width: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' }}
      className={`${heightClass} bg-white rounded-3xl overflow-hidden border border-[var(--color-border)]`}
    >
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={{ lat: villa.lat, lng: villa.lng }}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={false}
          clickableIcons={false}
          styles={BALINSKY_MAP_STYLE}
          backgroundColor="#F2EAD8"
        >
          <MapLayer
            villa={villa}
            competitors={competitors}
            radiusKm={radiusKm}
            selectedId={selectedId}
            onSelect={id => setSelectedId(prev => (prev === id ? null : id))}
          />
          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelectedId(null)}
              pixelOffset={[0, -22]}
              headerDisabled
            >
              <PopupCard p={selected} onClose={() => setSelectedId(null)} />
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  )
}
