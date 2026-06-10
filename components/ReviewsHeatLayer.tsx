'use client'

import { useEffect, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { Flame } from 'lucide-react'
import type { HeatCell } from '@/lib/reviews-heat'

// Blue (few reviews) → red (many). First stop must be transparent so empty
// areas don't tint the map.
const GRADIENT = [
  'rgba(0, 80, 255, 0)',
  'rgba(0, 80, 255, 0.55)',
  'rgba(0, 170, 255, 0.65)',
  'rgba(0, 230, 180, 0.7)',
  'rgba(140, 230, 0, 0.8)',
  'rgba(255, 210, 0, 0.9)',
  'rgba(255, 120, 0, 0.95)',
  'rgba(255, 0, 0, 1)',
]

// Heatmap overlay driven by Google review density. Lives INSIDE <Map> so it
// can grab the map instance + lazily load the `visualization` library.
export function ReviewsHeatLayer({
  cells,
  max,
  visible,
}: {
  cells: HeatCell[]
  max: number
  visible: boolean
}) {
  const map = useMap()
  const viz = useMapsLibrary('visualization')
  const layerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null)

  useEffect(() => {
    if (!map || !viz || cells.length === 0) return
    if (!layerRef.current) {
      layerRef.current = new viz.HeatmapLayer({
        data: cells.map(c => ({
          location: new google.maps.LatLng(c.lat, c.lng),
          weight: c.weight,
        })),
        radius: 38,
        opacity: 0.62,
        dissipating: true,
        maxIntensity: max,
        gradient: GRADIENT,
      })
    }
    layerRef.current.setMap(visible ? map : null)
  }, [map, viz, cells, max, visible])

  // Detach on unmount so a torn-down map doesn't keep the layer alive.
  useEffect(() => () => { layerRef.current?.setMap(null) }, [])

  return null
}

// Pill toggle + legend, rendered over the map (outside <Map>).
export function ReviewsHeatToggle({
  on,
  onToggle,
  lang = 'ru',
}: {
  on: boolean
  onToggle: () => void
  lang?: 'ru' | 'en'
}) {
  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={on}
        className={
          'inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium shadow-md backdrop-blur transition-colors cursor-pointer border ' +
          (on
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'bg-white/90 text-[#111827] border-[var(--color-border)] hover:border-[var(--color-primary)]')
        }
      >
        <Flame size={15} className={on ? 'text-white' : 'text-[#FF5A36]'} />
        {lang === 'en' ? 'Reviews heatmap' : 'Тепловая карта отзывов'}
      </button>
      {on && (
        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur shadow-sm text-[11px] text-[var(--color-text-muted)]">
          <span>{lang === 'en' ? 'few' : 'мало'}</span>
          <span
            className="h-2 w-24 rounded-full"
            style={{ background: 'linear-gradient(90deg, #0050FF, #00E6B4, #FFD200, #FF0000)' }}
          />
          <span>{lang === 'en' ? 'many' : 'много'}</span>
        </div>
      )}
    </div>
  )
}
