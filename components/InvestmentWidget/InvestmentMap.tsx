'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame } from 'lucide-react'
import { BALINSKY_MAP_STYLE } from '@/lib/google-map-style'
import { loadGoogleMaps } from '@/lib/google-maps-loader'
import { createHeatOverlay, fetchHeatCells } from '@/lib/heat-overlay'
import type { Snapshot } from './types'
import { pickCopy, type Lang } from '@/lib/i18n'
import { translit, hasCyrillic } from '@/lib/translit'

// POI names/addresses come from Google Places in Russian only. Transliterate
// to Latin on non-RU pages so infowindows don't show Cyrillic.
function locTx(s: string | null | undefined, lang: Lang): string {
  if (!s) return ''
  return lang !== 'ru' && hasCyrillic(s) ? translit(s) : s
}

const COLORS = {
  villa: '#E0383E',
  villaRing: '#FFFFFF',
  comp: '#3B82F6',
  compHover: '#1D4ED8',
  anchor: '#16A34A',
  zone: '#E0383E',
}

const MAP_COPY = {
  ru: {
    unavailable: 'Карта недоступна',
    villa: 'Вилла', competitors: 'Конкуренты', anchors: 'Якоря',
    anchorsOnly: 'Только якоря', allPois: 'Все POI',
    heat: 'Карта туризма',
    perNight: ' / ночь',
    openBooking: 'Открыть на Booking →',
    openMaps: 'Открыть на Google Maps →',
    reviewsSuffix: ' отзывов',
    minByScooter: (min: number) => `${min} мин на скутере`,
    distLabel: 'От виллы',
    bookingTitle: (adr: number, beds: number | null) =>
      `Booking: ${adr} $/ночь${beds != null ? ` · ${beds} BR` : ''}`,
  },
  en: {
    unavailable: 'Map unavailable',
    villa: 'Villa', competitors: 'Competitors', anchors: 'Anchors',
    anchorsOnly: 'Anchors only', allPois: 'All POIs',
    heat: 'Tourism map',
    perNight: ' / night',
    openBooking: 'Open on Booking →',
    openMaps: 'Open on Google Maps →',
    reviewsSuffix: ' reviews',
    minByScooter: (min: number) => `${min} min by scooter`,
    distLabel: 'From the villa',
    bookingTitle: (adr: number, beds: number | null) =>
      `Booking: $${adr}/night${beds != null ? ` · ${beds} BR` : ''}`,
  },
  id: {
    unavailable: 'Peta tidak tersedia',
    villa: 'Vila', competitors: 'Pesaing', anchors: 'Jangkar',
    anchorsOnly: 'Hanya jangkar', allPois: 'Semua POI',
    heat: 'Peta pariwisata',
    perNight: ' / malam',
    openBooking: 'Buka di Booking →',
    openMaps: 'Buka di Google Maps →',
    reviewsSuffix: ' ulasan',
    minByScooter: (min: number) => `${min} mnt naik skuter`,
    distLabel: 'Dari vila',
    bookingTitle: (adr: number, beds: number | null) =>
      `Booking: $${adr}/malam${beds != null ? ` · ${beds} BR` : ''}`,
  },
  fr: {
    unavailable: 'Carte indisponible',
    villa: 'Villa', competitors: 'Concurrents', anchors: 'Points de repère',
    anchorsOnly: 'Repères seuls', allPois: 'Tous les POI',
    heat: 'Carte du tourisme',
    perNight: ' / nuit',
    openBooking: 'Ouvrir sur Booking →',
    openMaps: 'Ouvrir sur Google Maps →',
    reviewsSuffix: ' avis',
    minByScooter: (min: number) => `${min} min en scooter`,
    distLabel: 'Depuis la villa',
    bookingTitle: (adr: number, beds: number | null) =>
      `Booking : ${adr} $/nuit${beds != null ? ` · ${beds} BR` : ''}`,
  },
} as const

// Haversine on a sphere — same formula used elsewhere in
// lib/competitor-utils. Inlined here so the popup HTML formatter is
// pure (no async lookups).
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = (bLat - aLat) * Math.PI / 180
  const dLng = (bLng - aLng) * Math.PI / 180
  const lat1 = aLat * Math.PI / 180
  const lat2 = bLat * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Bali scooter average is ~25-30 km/h in town. Use 25 km/h to err on
// the realistic side (traffic, lights, narrow side roads). Caps at 1
// min so very close POIs don't render as "0 min" — looks broken.
function scooterMinutes(km: number): number {
  const m = Math.max(1, Math.round((km / 25) * 60))
  return m
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

function esc(s: string | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function fmtAdr(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function competitorPopupHtml(c: {
  name?: string | null; complex?: string | null; photo?: string | null;
  rating?: number | null; reviews?: number | null; bedrooms?: number | null;
  area?: number | null; adr: number; url?: string | null;
  distanceKm?: number | null
}, lang: Lang): string {
  const t = pickCopy(MAP_COPY, lang)
  const sqmU = lang === 'ru' ? 'м²' : 'm²'
  const kmLabel = lang === 'ru' ? 'км' : 'km'
  const title = c.complex || c.name || 'Booking listing'
  const stars = c.rating != null ? `★ ${c.rating.toFixed(1)}` : ''
  const reviews = c.reviews != null ? `${c.reviews} ${lang === 'ru' ? 'отзывов' : 'reviews'}` : ''
  const beds = c.bedrooms != null ? `${c.bedrooms} BR` : ''
  const area = c.area != null ? `${c.area} ${sqmU}` : ''
  const specs = [beds, area].filter(Boolean).join(' · ')
  const meta = [specs, [stars, reviews].filter(Boolean).join(' · ')].filter(Boolean).join(' · ')
  const photo = c.photo
    ? `<div style="width:280px;height:160px;background:#F2EAD8;overflow:hidden"><img src="${esc(c.photo)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>`
    : ''
  const dist = c.distanceKm != null
    ? `<div style="font-size:12px;color:#1E3A5F;background:#E6EEF7;display:inline-block;padding:3px 8px;border-radius:999px;white-space:nowrap">🛵 ${esc(t.minByScooter(scooterMinutes(c.distanceKm)))} · ${c.distanceKm.toFixed(1)} ${kmLabel}</div>`
    : ''
  const link = c.url
    ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer nofollow" style="color:#1D4ED8;text-decoration:none;font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:2px">${t.openBooking}</a>`
    : ''
  return `
    <div style="font-family:-apple-system,system-ui,sans-serif;width:280px;color:#111827;font-size:13px;line-height:1.4">
      ${photo}
      <div style="padding:12px">
        <div style="font-weight:600;font-size:15px;line-height:1.25;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(title)}</div>
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px">
          <div style="font-weight:700;color:#1D4ED8;font-size:17px;line-height:1">${fmtAdr(c.adr)}<span style="color:#6B7280;font-weight:400;font-size:11px;margin-left:2px">${t.perNight}</span></div>
        </div>
        ${meta ? `<div style="font-size:12px;color:#6B7280;margin-bottom:8px">${esc(meta)}</div>` : ''}
        ${dist ? `<div style="margin-bottom:10px">${dist}</div>` : ''}
        ${link}
      </div>
    </div>
  `.trim()
}

function anchorPopupHtml(a: {
  name?: string | null; primaryType?: string | null;
  rating?: number | null; reviews?: number | null;
  address?: string | null; mapsUrl?: string | null;
  distanceKm?: number | null
}, lang: Lang): string {
  const t = pickCopy(MAP_COPY, lang)
  const kmLabel = lang === 'ru' ? 'км' : 'km'
  const title = locTx(a.name, lang) || 'POI'
  const stars = a.rating != null ? `★ ${a.rating.toFixed(1)}` : ''
  const reviewsTxt = a.reviews != null ? `${a.reviews} ${lang === 'ru' ? 'отзывов' : 'reviews'}` : ''
  const ratingLine = [stars, reviewsTxt].filter(Boolean).join(' · ')
  const cat = a.primaryType ? a.primaryType.replace(/_/g, ' ') : ''
  const link = a.mapsUrl
    ? `<a href="${esc(a.mapsUrl)}" target="_blank" rel="noopener noreferrer" style="color:#16A34A;text-decoration:none;font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:2px">${t.openMaps}</a>`
    : ''
  const dist = a.distanceKm != null
    ? `<div style="font-size:12px;color:#1F3B2F;background:#E8F0EC;display:inline-block;padding:3px 8px;border-radius:999px;white-space:nowrap">🛵 ${esc(t.minByScooter(scooterMinutes(a.distanceKm)))} · ${a.distanceKm.toFixed(1)} ${kmLabel}</div>`
    : ''
  return `
    <div style="font-family:-apple-system,system-ui,sans-serif;width:260px;color:#111827;font-size:13px;line-height:1.4">
      <div style="padding:12px">
        ${cat ? `<div style="font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">${esc(cat)}</div>` : ''}
        <div style="font-weight:600;font-size:15px;line-height:1.25;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(title)}</div>
        ${ratingLine ? `<div style="font-size:12px;margin-bottom:8px"><span style="color:#F59E0B">${esc(stars)}</span>${reviewsTxt ? `<span style="color:#6B7280"> · ${esc(reviewsTxt)}</span>` : ''}</div>` : ''}
        ${dist ? `<div style="margin-bottom:10px">${dist}</div>` : ''}
        ${a.address ? `<div style="font-size:12px;color:#6B7280;margin-bottom:10px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(locTx(a.address, lang))}</div>` : ''}
        ${link}
      </div>
    </div>
  `.trim()
}

function MapLayer({ map, snap, showAllPois, allPois, lang }: { map: google.maps.Map | null; snap: Snapshot; showAllPois: boolean; allPois: { lat: number; lng: number; name: string | null; category: string }[]; lang: Lang }) {
  const ref = useRef<{ markers: google.maps.Marker[]; circles: google.maps.Circle[] }>({ markers: [], circles: [] })
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const fitOnceRef = useRef(false)
  const t = pickCopy(MAP_COPY, lang)

  useEffect(() => {
    if (!map) return
    // InfoWindow with an explicit maxWidth — without it Google
    // sometimes squeezes the bubble to ~150 px on mobile + cramped
    // viewports, which broke the popup layout (3-line title, cut-off
    // price). 320 px is wide enough for the 280-px photo + side padding.
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow({ maxWidth: 320, pixelOffset: new google.maps.Size(0, -8) })
    }
    const iw = infoWindowRef.current
    for (const m of ref.current.markers) m.setMap(null)
    for (const c of ref.current.circles) c.setMap(null)
    ref.current = { markers: [], circles: [] }

    const compsById = new Map(snap.competitors.map(c => [c.id, c]))

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
        title: t.bookingTitle(c.adr, c.bedrooms ?? null),
      })
      m.addListener('click', () => {
        const card = compsById.get(c.id)
        const km = distanceKm(snap.villa.lat, snap.villa.lng, c.lat, c.lng)
        iw.setContent(competitorPopupHtml({ ...(card ?? { adr: c.adr, bedrooms: c.bedrooms }), distanceKm: km }, lang))
        iw.open(map, m)
      })
      ref.current.markers.push(m)
    }

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
      m.addListener('click', () => {
        const km = distanceKm(snap.villa.lat, snap.villa.lng, a.lat, a.lng)
        iw.setContent(anchorPopupHtml({ ...a, distanceKm: km }, lang))
        iw.open(map, m)
      })
      ref.current.markers.push(m)
    }

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
        m.addListener('click', () => {
          const km = distanceKm(snap.villa.lat, snap.villa.lng, p.lat, p.lng)
          iw.setContent(anchorPopupHtml({ name: p.name, primaryType: p.category, distanceKm: km }, lang))
          iw.open(map, m)
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
  }, [map, snap, showAllPois, allPois, lang, t])

  return null
}

export function InvestmentMap({
  apiKey,
  snap,
  allPois,
  heightClass = 'h-[480px]',
  lang = 'ru',
}: {
  apiKey: string
  snap: Snapshot
  allPois: { lat: number; lng: number; name: string | null; category: string }[]
  heightClass?: string
  lang?: Lang
}) {
  const [showAllPois, setShowAllPois] = useState(false)
  // Tourism heat overlay is on by default on listing pages; the toggle
  // still lets the visitor turn it off.
  const [showHeat, setShowHeat] = useState(true)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const heatRef = useRef<google.maps.OverlayView | null>(null)
  const heatDataRef = useRef<{ cells: { lat: number; lng: number; weight: number }[]; max: number } | null>(null)
  const t = pickCopy(MAP_COPY, lang)

  // Island-wide Google-places heat overlay — fetched lazily on first toggle.
  useEffect(() => {
    if (!map) return
    let cancelled = false
    if (showHeat) {
      void (async () => {
        if (!heatDataRef.current) heatDataRef.current = await fetchHeatCells()
        if (cancelled || !heatDataRef.current || heatDataRef.current.cells.length === 0) return
        try {
          if (!heatRef.current) heatRef.current = createHeatOverlay(heatDataRef.current.cells, heatDataRef.current.max)
          heatRef.current.setMap(map)
        } catch { heatRef.current?.setMap(null); heatRef.current = null }
      })()
    } else {
      heatRef.current?.setMap(null)
    }
    return () => { cancelled = true }
  }, [map, showHeat])
  useEffect(() => () => { heatRef.current?.setMap(null) }, [])

  // Load Google Maps SDK once + instantiate the Map on the container
  // ref. Replaces @vis.gl/react-google-maps' <APIProvider> + <Map> —
  // saves ~50 KB gzip on the InvestmentWidget chunk while keeping the
  // exact same look/feel and gesture handling.
  useEffect(() => {
    if (!apiKey || !containerRef.current || map) return
    let cancelled = false
    loadGoogleMaps(apiKey).then(() => {
      if (cancelled || !containerRef.current) return
      const instance = new google.maps.Map(containerRef.current, {
        center: { lat: snap.villa.lat, lng: snap.villa.lng },
        zoom: 14,
        gestureHandling: 'greedy',
        streetViewControl: true,
        zoomControl: true,
        fullscreenControl: true,
        mapTypeControl: false,
        rotateControl: false,
        scaleControl: false,
        clickableIcons: false,
        styles: BALINSKY_MAP_STYLE,
        backgroundColor: '#F2EAD8',
      })
      setMap(instance)
    }).catch(() => { /* fall through to "unavailable" tile */ })
    return () => { cancelled = true }
  }, [apiKey, snap.villa.lat, snap.villa.lng, map])

  if (!apiKey) {
    return <div className={`${heightClass} bg-[var(--color-search-bg)] rounded-3xl flex items-center justify-center text-[var(--color-text-muted)]`}>{t.unavailable}</div>
  }

  return (
    <div className={`relative ${heightClass} bg-white rounded-3xl overflow-hidden border border-[var(--color-border)]`}>
      <div ref={containerRef} className="absolute inset-0" style={{ backgroundColor: '#F2EAD8' }} />
      <MapLayer map={map} snap={snap} showAllPois={showAllPois} allPois={allPois} lang={lang} />

      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] px-3 py-2 text-[12px] flex items-center gap-3 shadow-sm">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E0383E]" /> {t.villa}</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> {t.competitors}</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" /> {t.anchors}</span>
      </div>
      <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => setShowHeat(v => !v)}
          aria-pressed={showHeat}
          className={
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium cursor-pointer shadow-sm backdrop-blur-sm ' +
            (showHeat
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-white/95 text-[#111827] border-[var(--color-border)] hover:border-[var(--color-primary)]')
          }
        >
          <Flame size={13} className={showHeat ? 'text-white' : 'text-[#FF5A36]'} />
          {t.heat}
        </button>
        {showHeat && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-sm shadow-sm text-[10px] text-[var(--color-text-muted)]">
            <span>{lang === 'ru' ? 'мало' : 'few'}</span>
            <span className="h-1.5 w-16 rounded-full" style={{ background: 'linear-gradient(90deg,#2b6cff,#00c2c7,#8ed11f,#ffd200,#ff2d00)' }} />
            <span>{lang === 'ru' ? 'много' : 'many'}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowAllPois(v => !v)}
          className="bg-white/95 backdrop-blur-sm rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[12px] font-medium hover:border-[var(--color-primary)] cursor-pointer shadow-sm"
        >
          {showAllPois ? t.anchorsOnly : t.allPois}
        </button>
      </div>
    </div>
  )
}
