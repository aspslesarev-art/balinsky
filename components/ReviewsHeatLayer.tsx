'use client'

import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import { Flame } from 'lucide-react'
import { createHeatOverlay, type HeatCell } from '@/lib/heat-overlay'
import { pickCopy, type Lang } from '@/lib/i18n'

// Thin @vis.gl wrapper around the shared heat overlay (lib/heat-overlay).
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
  const overlayRef = useRef<google.maps.OverlayView | null>(null)

  useEffect(() => {
    if (!map || cells.length === 0 || typeof google === 'undefined' || !google.maps?.OverlayView) return
    try {
      if (!overlayRef.current) overlayRef.current = createHeatOverlay(cells, max)
      overlayRef.current.setMap(visible ? map : null)
    } catch {
      overlayRef.current?.setMap(null)
      overlayRef.current = null
    }
  }, [map, cells, max, visible])

  useEffect(() => () => { overlayRef.current?.setMap(null) }, [])

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
  lang?: Lang
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
        {pickCopy({ ru: 'Карта туризма', en: 'Tourism map', id: 'Peta wisata', fr: 'Carte touristique', de: 'Tourismuskarte', zh: '旅游热力图', nl: 'Toeristische kaart', ban: 'Peta pariwisata' }, lang)}
      </button>
      {on && (
        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur shadow-sm text-[11px] text-[var(--color-text-muted)]">
          <span>{pickCopy({ ru: 'мало', en: 'few', id: 'sedikit', fr: 'peu', de: 'wenig', zh: '少', nl: 'weinig', ban: 'akidik' }, lang)}</span>
          <span
            className="h-2 w-24 rounded-full"
            style={{ background: 'linear-gradient(90deg, #2b6cff, #00c2c7, #8ed11f, #ffd200, #ff2d00)' }}
          />
          <span>{pickCopy({ ru: 'много', en: 'many', id: 'banyak', fr: 'beaucoup', de: 'viel', zh: '多', nl: 'veel', ban: 'akeh' }, lang)}</span>
        </div>
      )}
    </div>
  )
}
