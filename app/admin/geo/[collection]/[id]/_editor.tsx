'use client'

// Georeference editor: controls on the left, satellite on the right.
//
// Placement follows how an admin actually works — drag the pin onto the plot,
// then dial the masterplan's real-world width and rotation until its roofs sit
// on the roofs visible in the imagery. Once construction has started the site
// is legible from orbit, so alignment is a matter of matching shapes.
//
// Direct corner-dragging was considered and dropped: sub-metre precision with a
// mouse on a rotated bitmap is worse than a slider plus nudge buttons, and the
// sun editor next door already establishes the nudge idiom.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { loadGoogleMaps } from '@/lib/google-maps-loader'
import { createGeoImageOverlay, type GeoImageOverlay } from '@/lib/geo-overlay'
import {
  DEFAULT_OVERLAY,
  metresToLatDelta,
  metresToLngDelta,
  type GeoOverlay,
} from '@/lib/geo-placement'
import type { GeoCollection, GeoRow } from '@/lib/complex-geo'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// Somewhere in Canggu — only used when a listing has no coordinates at all, so
// the map opens over Bali instead of null island.
const FALLBACK = { lat: -8.6478, lng: 115.1385 }

export function GeoPlacementEditor({
  apiKey,
  collection,
  row,
}: {
  apiKey: string
  collection: GeoCollection
  row: GeoRow
}) {
  const hadCoords = row.lat != null && row.lng != null
  const [lat, setLat] = useState(row.lat ?? FALLBACK.lat)
  const [lng, setLng] = useState(row.lng ?? FALLBACK.lng)
  const [overlay, setOverlay] = useState<GeoOverlay | null>(row.overlay)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  // Grab-the-plan is the default once there is a plan: it is what alignment
  // actually consists of. The toggle hands the map back for panning/zooming.
  const [dragMode, setDragMode] = useState(true)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const overlayRef = useRef<GeoImageOverlay | null>(null)

  const touched = useCallback(() => {
    setSaveState('idle')
    setError(null)
  }, [])

  const updateOverlay = (patch: Partial<GeoOverlay>) => {
    setOverlay((prev) => (prev ? { ...prev, ...patch } : prev))
    touched()
  }

  const moveBy = (northM: number, eastM: number) => {
    setLat((prev) => prev + metresToLatDelta(northM))
    setLng((prev) => prev + metresToLngDelta(eastM, lat))
    touched()
  }

  // Map + draggable pin. Built once; later state changes drive it imperatively,
  // so the deps deliberately exclude lat/lng — they are only the initial view.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const map = new google.maps.Map(containerRef.current, {
          center: { lat, lng },
          // 19 is about as close as Bali imagery stays sharp.
          zoom: hadCoords ? 19 : 15,
          mapTypeId: 'hybrid',
          // 45° imagery would make a flat overlay impossible to align.
          tilt: 0,
          gestureHandling: 'greedy',
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          clickableIcons: false,
        })
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
          zIndex: 20,
          title: 'Центр объекта — тащи',
        })
        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          if (!pos) return
          setLat(pos.lat())
          setLng(pos.lng())
          touched()
        })
        mapRef.current = map
        markerRef.current = marker
      })
      .catch(() => setError('Google Maps не загрузилась'))

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is built once; lat/lng seed the initial view only
  }, [apiKey, hadCoords, touched])

  // Keep the pin in sync when coordinates change from the number inputs or the
  // nudge buttons rather than from a drag.
  useEffect(() => {
    markerRef.current?.setPosition({ lat, lng })
  }, [lat, lng])

  // Attach / update / detach the masterplan overlay.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!overlay) {
      overlayRef.current?.setMap(null)
      overlayRef.current = null
      return
    }
    if (!overlayRef.current) {
      overlayRef.current = createGeoImageOverlay({ lat, lng, overlay })
      overlayRef.current.setMap(map)
      return
    }
    overlayRef.current.setPlacement({ lat, lng, overlay })
  }, [lat, lng, overlay])

  useEffect(() => () => { overlayRef.current?.setMap(null) }, [])

  const upload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('collection', collection)
      form.set('id', row.id)
      const res = await fetch('/api/admin/geo/upload', { method: 'POST', body: form })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
      setOverlay((prev) => ({ ...DEFAULT_OVERLAY, ...prev, imageUrl: body.url as string }))
      setSaveState('idle')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить файл')
    } finally {
      setUploading(false)
    }
  }

  // --- direct manipulation ---------------------------------------------------
  // One pointer drags the plan onto the building; two pinch to resize and twist
  // to rotate. Every frame is computed against the gesture's own starting state
  // rather than the previous frame, so a long drag accumulates no drift.

  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<{
    lat: number
    lng: number
    widthM: number
    rotationDeg: number
    px: number
    py: number
    dist: number
    angle: number
  } | null>(null)

  const localPoint = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  /** Midpoint, spread and twist of a two-finger gesture; null while one finger is down. */
  const pinch = () => {
    const pts = [...pointersRef.current.values()]
    if (pts.length < 2) return null
    const dx = pts[1].x - pts[0].x
    const dy = pts[1].y - pts[0].y
    return {
      dist: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx),
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2,
    }
  }

  // Re-baselining on every finger down/up is what makes going from one finger
  // to two (and back) feel continuous instead of snapping.
  const baseline = () => {
    if (!overlay) return
    const two = pinch()
    const origin = two ?? [...pointersRef.current.values()][0]
    if (!origin) return
    gestureRef.current = {
      lat,
      lng,
      widthM: overlay.widthM,
      rotationDeg: overlay.rotationDeg,
      px: origin.x,
      py: origin.y,
      dist: two?.dist ?? 0,
      angle: two?.angle ?? 0,
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, localPoint(e))
    baseline()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    const ov = overlayRef.current
    if (!gesture || !ov || !pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, localPoint(e))

    const two = pinch()
    const now = two ?? pointersRef.current.get(e.pointerId)
    if (!now) return

    // Translate through the projection so a drag moves the plan by exactly the
    // ground distance under the cursor, at any zoom.
    const from = ov.containerPixelToLatLng(gesture.px, gesture.py)
    const to = ov.containerPixelToLatLng(now.x, now.y)
    if (from && to) {
      setLat(gesture.lat + (to.lat - from.lat))
      setLng(gesture.lng + (to.lng - from.lng))
    }

    if (two && gesture.dist > 0) {
      const scaled = gesture.widthM * (two.dist / gesture.dist)
      const twisted = gesture.rotationDeg + ((two.angle - gesture.angle) * 180) / Math.PI
      setOverlay((prev) => prev && {
        ...prev,
        widthM: clamp(scaled, 5, 3000),
        rotationDeg: ((twisted % 360) + 360) % 360,
      })
    }
    touched()
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size === 0) gestureRef.current = null
    else baseline()
  }

  /** Wheel resizes the plan — the map is not reachable while drag mode is on anyway. */
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!overlay) return
    const factor = e.deltaY > 0 ? 0.96 : 1.04
    updateOverlay({ widthM: clamp(overlay.widthM * factor, 5, 3000) })
  }

  const save = async () => {
    setSaveState('saving')
    setError(null)
    try {
      const res = await fetch(`/api/admin/geo/${collection}/${row.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lat, lng, overlay }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
      setSaveState('saved')
    } catch (e: unknown) {
      setSaveState('error')
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
    }
  }

  return (
    <main className="flex h-[100dvh] flex-col lg:flex-row">
      <section className="w-full shrink-0 overflow-y-auto border-b border-neutral-200 p-5 lg:w-[380px] lg:border-b-0 lg:border-r dark:border-neutral-800">
        <h1 className="text-base font-semibold">{row.title} — привязка к карте</h1>
        <p className="mt-1 text-xs text-neutral-500">
          {row.district ?? 'район не указан'} · <code>{row.id}</code>
        </p>
        {!hadCoords && (
          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            У объекта не было координат — карта открыта над Чангу, поставь пин вручную.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <NumberField label="Широта" value={lat} onChange={(v) => { setLat(v); touched() }} />
          <NumberField label="Долгота" value={lng} onChange={(v) => { setLng(v); touched() }} />
        </div>

        <div className="mt-3">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-500">Сдвинуть центр</p>
          <div className="grid grid-cols-3 gap-1.5">
            <span />
            <StepButton onClick={() => moveBy(5, 0)}>↑ 5 м</StepButton>
            <span />
            <StepButton onClick={() => moveBy(0, -5)}>← 5 м</StepButton>
            <StepButton onClick={() => moveBy(0, 5)}>5 м →</StepButton>
            <StepButton onClick={() => moveBy(-5, 0)}>↓ 5 м</StepButton>
          </div>
        </div>

        <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Мастерплан поверх спутника</p>
        </div>

        <label className="mt-3 block">
          <span className="text-xs text-neutral-500">
            {overlay ? 'Заменить картинку' : 'Загрузить вид сверху (лучше PNG с прозрачным фоном)'}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void upload(file)
              e.target.value = ''
            }}
            className="mt-1 block w-full text-xs file:mr-2 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-2 file:py-1 file:text-xs dark:file:border-neutral-700 dark:file:bg-neutral-900"
          />
        </label>
        {uploading && <p className="mt-1 text-xs text-neutral-500">Загружаю…</p>}

        {overlay && (
          <>
            <Slider
              label="Ширина по земле"
              value={`${Math.round(overlay.widthM)} м`}
              current={overlay.widthM}
              min={5}
              max={3000}
              step={1}
              steps={[-25, -5, 5, 25]}
              onChange={(v) => updateOverlay({ widthM: v })}
              onStep={(d) => updateOverlay({ widthM: clamp(overlay.widthM + d, 5, 3000) })}
            />
            <Slider
              label="Поворот"
              value={`${Math.round(overlay.rotationDeg)}°`}
              current={overlay.rotationDeg}
              min={0}
              max={359}
              step={1}
              steps={[-10, -1, 1, 10]}
              onChange={(v) => updateOverlay({ rotationDeg: v })}
              onStep={(d) => updateOverlay({ rotationDeg: (((overlay.rotationDeg + d) % 360) + 360) % 360 })}
            />
            <Slider
              label="Прозрачность"
              value={`${Math.round(overlay.opacity * 100)}%`}
              current={overlay.opacity}
              min={0.1}
              max={1}
              step={0.05}
              steps={[-0.1, -0.05, 0.05, 0.1]}
              onChange={(v) => updateOverlay({ opacity: v })}
              onStep={(d) => updateOverlay({ opacity: clamp(overlay.opacity + d, 0.1, 1) })}
            />
            <button
              type="button"
              onClick={() => { setOverlay(null); touched() }}
              className="mt-4 w-full rounded-lg border border-neutral-300 px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Убрать мастерплан
            </button>
          </>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saveState === 'saving'}
          className="mt-5 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {saveState === 'saving' ? 'Сохраняю…' : 'Сохранить'}
        </button>
        {saveState === 'saved' && (
          <p className="mt-2 text-xs text-emerald-600">Сохранено. Страница объекта обновится сразу.</p>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </section>

      <section className="relative min-h-[420px] flex-1">
        <div ref={containerRef} className="h-full w-full" />

        {overlay && dragMode && (
          <div
            // touch-none stops the browser from claiming the gesture as a scroll
            // before the pointer handlers ever see the second finger.
            className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          />
        )}

        {overlay && (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-2">
            <button
              type="button"
              onClick={() => setDragMode((v) => !v)}
              aria-pressed={dragMode}
              className={
                'pointer-events-auto rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm ' +
                (dragMode
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-neutral-300 bg-white/95 text-neutral-800 hover:border-amber-500')
              }
            >
              {dragMode ? '✋ Двигаю план' : '🗺 Двигаю карту'}
            </button>
            <p className="pointer-events-auto max-w-[240px] rounded-lg bg-white/95 px-2 py-1.5 text-[11px] leading-snug text-neutral-600 shadow-sm backdrop-blur-sm">
              {dragMode
                ? 'Тяни план на нужное здание. Двумя пальцами — размер и поворот, колесом — размер. Чтобы подвинуть саму карту, переключи режим.'
                : 'Карта двигается и зумится как обычно. Переключи обратно, чтобы тянуть план.'}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

const clamp = (v: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, v)) * 1000) / 1000

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-500">
      {label}
      <input
        type="number"
        step="0.000001"
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (Number.isFinite(next)) onChange(next)
        }}
        className="rounded-md border border-neutral-300 px-2 py-1 text-sm tabular-nums dark:border-neutral-700 dark:bg-neutral-900"
      />
    </label>
  )
}

function StepButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-neutral-300 px-1 py-1 text-xs tabular-nums hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      {children}
    </button>
  )
}

/** Slider for the rough move, buttons for the last metre — same idiom as the sun editor. */
function Slider({
  label,
  value,
  current,
  min,
  max,
  step,
  steps,
  onChange,
  onStep,
}: {
  label: string
  value: string
  current: number
  min: number
  max: number
  step: number
  steps: number[]
  onChange: (value: number) => void
  onStep: (delta: number) => void
}) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</span>
        <b className="text-sm tabular-nums">{value}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mb-2 w-full accent-amber-500"
        aria-label={label}
      />
      <div className="flex items-center gap-1.5">
        {steps.map((delta) => (
          <button
            key={delta}
            type="button"
            onClick={() => onStep(delta)}
            className="flex-1 rounded-md border border-neutral-300 px-1 py-1 text-xs tabular-nums hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {delta > 0 ? `+${delta}` : delta}
          </button>
        ))}
      </div>
    </div>
  )
}
