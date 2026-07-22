'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer'
import { X } from 'lucide-react'
import { BALINSKY_MAP_STYLE } from '@/lib/google-map-style'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { ReviewsHeatLayer, ReviewsHeatToggle } from './ReviewsHeatLayer'
import type { HeatCell } from '@/lib/reviews-heat'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'

// Marker titles come from the raw RU `SEO:Title`. On non-RU maps, listings
// with no translation would otherwise show Cyrillic (e.g. "Вилла … в Ubud");
// transliterate as a last resort so the popup stays in the Latin alphabet.
function displayTitle(t: string, lang: Lang): string {
  return lang !== 'ru' && hasCyrillic(t) ? translitPreserveCase(t) : t
}

export type VillaPoint = {
  id: string
  slug: string
  title: string
  priceUsd: number | null
  thumb: string | null
}

// A map "group" is one or more listings at the same coordinate. Listings
// inside a residential complex routinely share identical lat/lng — the old
// per-point rendering swallowed them into a cluster that wouldn't expand at
// max zoom. Grouping at build time + multi-item popup matches what
// ApartmentsMap already does.
export type VillaPointGroup = { key: string; lat: number; lng: number; items: VillaPoint[] }

const BALI_CENTER = { lat: -8.4, lng: 115.15 }
const BALI_DEFAULT_ZOOM = 10
const SINGLE_POINT_ZOOM = 15

const COLORS = {
  primary: '#33A474',
  primaryHover: '#2C8E65',
  selected: '#1F3B2F',
  white: '#FFFFFF',
}

function pinSvg({ bg, size = 32, ring, count }: { bg: string; size?: number; ring?: string; count?: number }): string {
  const half = size / 2
  // When a marker represents multiple listings, stamp the count on top of
  // the dot so the user knows there's a list behind that single click.
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
function makeIcon(opts: { selected?: boolean; hover?: boolean; count?: number }) {
  const base = 32
  const size = opts.selected ? base + 6 : opts.hover ? base + 4 : base
  const bg = opts.selected ? COLORS.selected : opts.hover ? COLORS.primaryHover : COLORS.primary
  const ring = opts.selected ? COLORS.primary : undefined
  return {
    url: pinSvg({ bg, size, ring, count: opts.count }),
    size: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
    scaledSize: new google.maps.Size(size, size),
  }
}

function MapMarkers({ groups, selectedKey, onSelect }: {
  groups: VillaPointGroup[]
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
    if (markersRef.current) for (const m of markersRef.current.values()) m.setMap(null)
    const map2 = new globalThis.Map<string, google.maps.Marker>()
    for (const g of groups) {
      const count = g.items.length
      const marker = new google.maps.Marker({
        position: { lat: g.lat, lng: g.lng },
        icon: makeIcon({ count }),
        cursor: 'pointer',
      })
      marker.addListener('click', () => onSelect(g.key))
      marker.addListener('mouseover', () => { if (g.key !== selectedKey) marker.setIcon(makeIcon({ hover: true, count })) })
      marker.addListener('mouseout', () => { if (g.key !== selectedKey) marker.setIcon(makeIcon({ count })) })
      map2.set(g.key, marker)
    }
    markersRef.current = map2
    clustererRef.current = new MarkerClusterer({ map, markers: [...map2.values()], renderer: clusterRenderer })
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
    if (groups.length === 0) { map.setCenter(BALI_CENTER); map.setZoom(BALI_DEFAULT_ZOOM); return }
    if (groups.length === 1) { map.setCenter({ lat: groups[0].lat, lng: groups[0].lng }); map.setZoom(SINGLE_POINT_ZOOM); return }
    const bounds = new google.maps.LatLngBounds()
    for (const g of groups) bounds.extend({ lat: g.lat, lng: g.lng })
    map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, groupsKey])

  return null
}

function useFmtPrice(lang: Lang) {
  const { currency } = useCurrency()
  return (priceUsd: number | null) =>
    priceUsd != null && Number.isFinite(priceUsd) ? formatPrice(priceUsd, currency, lang) : null
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

function SinglePopup({ p, onClose, lang }: { p: VillaPoint; onClose: () => void; lang: Lang }) {
  const fmt = useFmtPrice(lang)
  const price = fmt(p.priceUsd)
  const title = displayTitle(p.title, lang)
  return (
    <div className="relative w-[260px] p-1">
      <CloseButton onClose={onClose} />
      {p.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- map InfoWindow popup, not a Next image
        <img src={p.thumb} alt={title} className="w-full h-[140px] object-cover rounded-xl mb-3" />
      ) : (
        <div className="w-full h-[140px] rounded-xl mb-3 bg-[#F1F5F1] flex items-center justify-center text-3xl">🏝️</div>
      )}
      <div className="text-[14px] font-semibold leading-snug mb-1.5 line-clamp-2 text-[#111827] pr-6">{title}</div>
      {price && <div className="text-[15px] font-semibold text-[#2C8E65] mb-3">{price}</div>}
      <a
        href={switchLangPath(`/ru/villy/o/${p.slug}`, lang)}
        className="block text-center w-full px-3 py-2 rounded-lg bg-[#33A474] hover:bg-[#2C8E65] text-white text-[13px] font-medium no-underline transition-colors"
      >
        {pickCopy({ ru: 'Открыть карточку', en: 'Open listing', id: 'Buka listing', fr: 'Voir le bien', de: 'Objekt öffnen', zh: '查看房源', nl: 'Bekijk woning', ban: 'Buka listing', pl: 'Otwórz ofertę', uk: 'Відкрити картку' }, lang)}
      </a>
    </div>
  )
}

function MultiPopup({ items, onClose, lang }: { items: VillaPoint[]; onClose: () => void; lang: Lang }) {
  const fmt = useFmtPrice(lang)
  return (
    <div className="relative w-[300px] p-1">
      <CloseButton onClose={onClose} />
      <div className="text-[13px] font-medium text-[#6B7280] mb-2 pr-6">
        {`${items.length} ${pickCopy({ ru: 'вилл в одной точке', en: 'villas at this point', id: 'vila di titik ini', fr: 'villas à cet endroit', de: 'Villen an diesem Punkt', zh: '栋别墅位于此处', nl: 'villa’s op dit punt', ban: 'vila di titik puniki', pl: 'willi w tym miejscu', uk: 'вілл у цій точці' }, lang)}`}
      </div>
      <ul className="max-h-[340px] overflow-y-auto -mx-1 px-1 divide-y divide-[#E5E7EB]">
        {items.map(p => {
          const price = fmt(p.priceUsd)
          return (
            <li key={p.id}>
              <a
                href={switchLangPath(`/ru/villy/o/${p.slug}`, lang)}
                className="flex items-center gap-3 py-2.5 no-underline text-[#111827] hover:bg-[#F8FAF8] rounded-md px-1"
              >
                {p.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- map InfoWindow popup, not a Next image
                  <img src={p.thumb} alt="" className="w-12 h-12 object-cover rounded-md shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-[#F1F5F1] rounded-md shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium leading-tight line-clamp-2">{displayTitle(p.title, lang)}</div>
                  {price && <div className="text-[13px] font-semibold text-[#2C8E65] mt-0.5">{price}</div>}
                </div>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function VillasMap({
  apiKey,
  groups,
  heatCells = [],
  heatMax = 1,
  heightClass = 'h-[calc(100vh_-_280px)] min-h-[480px]',
  lang = 'ru',
}: {
  apiKey: string
  groups: VillaPointGroup[]
  heatCells?: HeatCell[]
  heatMax?: number
  heightClass?: string
  lang?: Lang
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [showHeat, setShowHeat] = useState(false)
  const selected = useMemo(() => groups.find(g => g.key === selectedKey) ?? null, [groups, selectedKey])

  if (!apiKey) {
    return (
      <div style={{ width: '100%' }} className={`${heightClass} bg-[var(--color-search-bg)] rounded-3xl flex items-center justify-center text-[var(--color-text-muted)]`}>
        {pickCopy({ ru: 'Карта недоступна (нет API ключа)', en: 'Map unavailable (no API key)', id: 'Peta tidak tersedia (tanpa API key)', fr: 'Carte indisponible (pas de clé API)', de: 'Karte nicht verfügbar (kein API-Schlüssel)', zh: '地图不可用（缺少 API 密钥）', nl: 'Kaart niet beschikbaar (geen API-sleutel)', ban: 'Peta nenten wenten (tanpa API key)', pl: 'Mapa niedostępna (brak klucza API)', uk: 'Карта недоступна (немає API ключа)' }, lang)}
      </div>
    )
  }

  return (
    <div
      style={{ width: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' }}
      className={`${heightClass} relative bg-white rounded-3xl overflow-hidden border border-[var(--color-border)]`}
    >
      {heatCells.length > 0 && (
        <ReviewsHeatToggle on={showHeat} onToggle={() => setShowHeat(v => !v)} lang={lang} />
      )}
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
          <ReviewsHeatLayer cells={heatCells} max={heatMax} visible={showHeat} />
          <MapMarkers groups={groups} selectedKey={selectedKey} onSelect={k => setSelectedKey(prev => (prev === k ? null : k))} />
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
