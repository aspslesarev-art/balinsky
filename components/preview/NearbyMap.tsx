'use client'

import { useMemo, useState } from 'react'

export type MapPoi = {
  id: string
  name: string
  category: string
  categoryTitle: string
  lat: number
  lng: number
  distanceM: number
  walkMin: number | null
  reviews: number | null
  rating: number | null
  photoName: string | null
}

const ZOOM = 14
const TILE = 256
const HEIGHT = 300
/** Tourism heat ramp from the handoff. */
const RAMP = ['#f0d9a8', '#e0a94f', '#c9722a', '#a33c1c']

/** Web-mercator world pixel coordinates at ZOOM. */
function project(lat: number, lng: number): { x: number; y: number } {
  const scale = TILE * 2 ** ZOOM
  const x = ((lng + 180) / 360) * scale
  const s = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale
  return { x, y }
}

/**
 * Neighbourhood map for the template prototype: raw OSM tiles positioned by
 * hand, no map library. The site's real maps are Google-backed and their key
 * is referrer-locked to balinsky.info, so they render blank on localhost and
 * on Vercel preview URLs — useless for exactly the testing this page is for.
 */

/** Preview thumbnail + facts for the selected place. */
export function PoiCard({ poi }: { poi: MapPoi }) {
  const src = poi.photoName ? `/api/place-photo?name=${encodeURIComponent(poi.photoName)}` : null
  return (
    <div style={{
      marginTop: 16, display: 'flex', gap: 16, alignItems: 'stretch',
      border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden',
    }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={poi.name} loading="lazy" style={{
          width: 120, minHeight: 110, objectFit: 'cover', flex: 'none', display: 'block',
          background: 'var(--color-divider)',
        }} />
      )}
      <div style={{ padding: '16px 20px 16px 4px', minWidth: 0 }}>
        <div className="kicker">
          {poi.distanceM >= 1000 ? `${(poi.distanceM / 1000).toFixed(1)} км` : `${poi.distanceM} м`}
          {poi.walkMin ? ` · ${poi.walkMin} мин пешком` : ''}
          {poi.reviews ? ` · ${poi.reviews.toLocaleString('ru-RU')} отзывов` : ''}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.5 }}>
          <strong style={{ fontWeight: 500 }}>{poi.name}</strong>
          {poi.rating ? ` — рейтинг ${poi.rating}` : ''}. {poi.categoryTitle}.
        </p>
      </div>
    </div>
  )
}

export function NearbyMap({ center, pois, width = 520 }: { center: { lat: number; lng: number }; pois: MapPoi[]; width?: number }) {
  const [active, setActive] = useState(0)
  const [heat, setHeat] = useState(false)

  const focus = pois[active] ?? null
  // Centre between the complex and the selected POI so both stay in frame.
  const view = focus
    ? { lat: (center.lat + focus.lat) / 2, lng: (center.lng + focus.lng) / 2 }
    : center

  const { tiles, place } = useMemo(() => {
    const c = project(view.lat, view.lng)
    const left = c.x - width / 2
    const top = c.y - HEIGHT / 2
    const x0 = Math.floor(left / TILE), x1 = Math.floor((left + width) / TILE)
    const y0 = Math.floor(top / TILE), y1 = Math.floor((top + HEIGHT) / TILE)
    const out: { key: string; url: string; left: number; top: number }[] = []
    const n = 2 ** ZOOM
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        if (y < 0 || y >= n) continue
        const wx = ((x % n) + n) % n
        out.push({
          key: `${x}/${y}`,
          url: `https://tile.openstreetmap.org/${ZOOM}/${wx}/${y}.png`,
          left: x * TILE - left,
          top: y * TILE - top,
        })
      }
    }
    return {
      tiles: out,
      place: (lat: number, lng: number) => {
        const p = project(lat, lng)
        return { left: p.x - left, top: p.y - top }
      },
    }
  }, [view.lat, view.lng, width])

  const maxReviews = Math.max(1, ...pois.map(p => p.reviews ?? 0))

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
        border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', background: '#e8e0d3',
      }}>
        {tiles.map(t => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={t.key} src={t.url} alt="" width={TILE} height={TILE} loading="lazy"
            style={{ position: 'absolute', left: t.left, top: t.top, width: TILE, height: TILE }} />
        ))}

        {heat && (
          <div style={{ position: 'absolute', inset: 0, filter: 'blur(16px)', opacity: 0.72, pointerEvents: 'none' }}>
            {pois.map((p, i) => {
              const t = Math.pow((p.reviews ?? 0) / maxReviews, 0.55)
              const r = 26 + t * 74
              const pos = place(p.lat, p.lng)
              const color = RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))]
              return (
                <span key={i} style={{
                  position: 'absolute', left: pos.left - r, top: pos.top - r, width: r * 2, height: r * 2,
                  borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                }} />
              )
            })}
          </div>
        )}

        {pois.map((p, i) => {
          const pos = place(p.lat, p.lng)
          return (
            <button key={i} type="button" onClick={() => setActive(i)} aria-label={p.name}
              style={{
                position: 'absolute', left: pos.left - 6, top: pos.top - 6, width: 12, height: 12,
                borderRadius: '50%', padding: 0, cursor: 'pointer',
                background: i === active ? 'var(--color-accent)' : '#201f1d',
                border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.4)',
              }} />
          )
        })}
        {(() => {
          const pos = place(center.lat, center.lng)
          return (
            <span style={{
              position: 'absolute', left: pos.left - 9, top: pos.top - 9, width: 18, height: 18,
              borderRadius: '50%', background: 'var(--color-accent)', border: '3px solid #fff',
              boxShadow: '0 2px 8px rgba(0,0,0,.45)',
            }} />
          )
        })()}

        <button
          type="button"
          onClick={() => setHeat(h => !h)}
          className="glass"
          style={{
            position: 'absolute', top: 10, left: 10, padding: '7px 13px', borderRadius: 999,
            cursor: 'pointer', font: 'inherit', fontSize: 12,
            color: heat ? 'var(--color-accent-800)' : 'var(--color-text)',
          }}
        >
          {heat ? '● ' : '○ '}Плотность отзывов Google
        </button>
      </div>

      {focus && <PoiCard poi={focus} />}
    </div>
  )
}
