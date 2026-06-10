'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame } from 'lucide-react'
import { BALINSKY_MAP_STYLE } from '@/lib/google-map-style'
import { loadGoogleMaps } from '@/lib/google-maps-loader'
import { createHeatOverlay, fetchHeatCells } from '@/lib/heat-overlay'

// Compact location map with a Google-places heat toggle, for pages that don't
// already embed a map (e.g. the complex detail page). Centred on the listing
// with a pin; toggle reveals the island-wide tourist heat.
export function NeighborhoodHeatMap({
  apiKey,
  lat,
  lng,
  title,
  lang = 'ru',
  heightClass = 'h-[420px]',
}: {
  apiKey: string
  lat: number
  lng: number
  title: string
  lang?: 'ru' | 'en'
  heightClass?: string
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [showHeat, setShowHeat] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const heatRef = useRef<google.maps.OverlayView | null>(null)
  const heatDataRef = useRef<{ cells: { lat: number; lng: number; weight: number }[]; max: number } | null>(null)

  useEffect(() => {
    if (!apiKey || !containerRef.current || map) return
    let cancelled = false
    loadGoogleMaps(apiKey).then(() => {
      if (cancelled || !containerRef.current) return
      const m = new google.maps.Map(containerRef.current, {
        center: { lat, lng },
        zoom: 13,
        gestureHandling: 'greedy',
        streetViewControl: true,
        zoomControl: true,
        fullscreenControl: true,
        mapTypeControl: false,
        clickableIcons: false,
        styles: BALINSKY_MAP_STYLE,
        backgroundColor: '#F2EAD8',
      })
      new google.maps.Marker({
        position: { lat, lng },
        map: m,
        title,
        zIndex: 10,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#E0383E',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
      })
      setMap(m)
    }).catch(() => { /* unavailable */ })
    return () => { cancelled = true }
  }, [apiKey, lat, lng, title, map])

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

  if (!apiKey) return null

  return (
    <div className={`relative ${heightClass} bg-white rounded-3xl overflow-hidden border border-[var(--color-border)]`}>
      <div ref={containerRef} className="absolute inset-0" style={{ backgroundColor: '#F2EAD8' }} />
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
          {lang === 'en' ? 'Places heatmap' : 'Тепловая карта мест'}
        </button>
        {showHeat && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-sm shadow-sm text-[10px] text-[var(--color-text-muted)]">
            <span>{lang === 'en' ? 'few' : 'мало'}</span>
            <span className="h-1.5 w-16 rounded-full" style={{ background: 'linear-gradient(90deg,#2b6cff,#00c2c7,#8ed11f,#ffd200,#ff2d00)' }} />
            <span>{lang === 'en' ? 'many' : 'много'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
