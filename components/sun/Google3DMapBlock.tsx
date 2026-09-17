'use client'

// Кнопка «3D-карта Google» на странице ЖК: фотореалистичная 3D-карта Google
// (рельеф, снимок, где есть — объёмная застройка) и на ней модель комплекса.
//
// Каждое открытие — платная загрузка карты сверх бесплатного месячного объёма,
// поэтому SDK и карта грузятся только по клику и только после разрешения
// /api/map3d/open, которое держит суточный лимит (lib/map3d-quota.ts).

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Google3DView } from '@/lib/complex-sun-plan'
import { loadGoogleMaps } from '@/lib/google-maps-loader'

type Status = 'idle' | 'checking' | 'open' | 'limit' | 'error'

export type Google3DMapBlockProps = {
  apiKey: string
  view: Google3DView
  title: string
}

/** Камера облёта: точка, вокруг которой крутимся, и положение на орбите. */
type Orbit = { lat: number; lng: number; heading: number; tilt: number; range: number }

// Высота точки облёта над морем: площадка стоит примерно на 100 м.
const TARGET_ALTITUDE = 100
const MIN_RANGE = 120
const MAX_RANGE = 8000
const MAX_TILT = 85
const ROTATE_DEG_PER_PX = 0.3
const METERS_PER_DEG_LAT = 111_320

/** Стартовый вид: камера с севера смотрит на юг, за комплексом — океан. */
function overview(view: Google3DView): Orbit {
  return { lat: view.latitude, lng: view.longitude, heading: 190, tilt: 68, range: 1100 }
}

function topDown(view: Google3DView): Orbit {
  return { lat: view.latitude, lng: view.longitude, heading: 0, tilt: 0, range: 900 }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function Google3DMapBlock({ apiKey, view, title }: Google3DMapBlockProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [topView, setTopView] = useState(false)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.maps3d.Map3DElement | null>(null)
  const orbitRef = useRef<Orbit>(overview(view))
  const close = useCallback(() => setStatus('idle'), [])

  const open = useCallback(async () => {
    setStatus('checking')
    try {
      const res = await fetch('/api/map3d/open', { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as { allowed?: boolean }
      setTopView(false)
      setStatus(body.allowed ? 'open' : 'limit')
    } catch {
      setStatus('error')
    }
  }, [])

  /** Переносит состояние орбиты в камеру карты. */
  const applyOrbit = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const o = orbitRef.current
    map.center = { lat: o.lat, lng: o.lng, altitude: TARGET_ALTITUDE }
    map.heading = o.heading
    map.tilt = o.tilt
    map.range = o.range
  }, [])

  // Карта создаётся, когда модалка смонтирована, и уничтожается при закрытии.
  useEffect(() => {
    if (status !== 'open') return
    const mount = mountRef.current
    if (!mount) return
    let cancelled = false
    orbitRef.current = overview(view)

    ;(async () => {
      await loadGoogleMaps(apiKey)
      const { Map3DElement, Model3DElement } = (await google.maps.importLibrary(
        'maps3d',
      )) as google.maps.Maps3DLibrary
      if (cancelled) return

      const o = orbitRef.current
      const element = new Map3DElement({
        center: { lat: o.lat, lng: o.lng, altitude: TARGET_ALTITUDE },
        range: o.range,
        tilt: o.tilt,
        heading: o.heading,
        minTilt: 0,
        maxTilt: MAX_TILT,
        mode: 'SATELLITE',
        // Своё управление облётом (см. обработчики ниже) заменяет штатные
        // жесты и кнопки Google: те двигают карту, а не крутят её вокруг ЖК.
        defaultUIHidden: true,
      })
      element.style.display = 'block'
      element.style.height = '100%'
      // Модель собрана в осях «восток / север / вверх», в которых Google
      // читает glTF, поэтому разворот задаётся только поправкой к северу.
      element.append(
        new Model3DElement({
          src: view.modelUrl,
          position: { lat: view.latitude, lng: view.longitude, altitude: 0 },
          orientation: { heading: view.heading, tilt: 0, roll: 0 },
          altitudeMode: 'CLAMP_TO_GROUND',
        }),
      )
      mount.prepend(element)
      mapRef.current = element
    })().catch((e: unknown) => {
      console.error('[google-3d] map failed', e)
      if (!cancelled) setStatus('error')
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [status, apiKey, view])

  // «Вид сверху» и обратно — как в просмотре солнца и тени.
  useEffect(() => {
    if (status !== 'open') return
    orbitRef.current = topView ? topDown(view) : overview(view)
    applyOrbit()
  }, [topView, status, view, applyOrbit])

  // ── управление облётом, как у OrbitControls в SunScene ─────────────────────
  // Мышь: левая кнопка — вращать, правая — сдвигать, колесо — приближать.
  // Палец: один — вращать, два — приближать щипком и сдвигать.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const dragMode = useRef<'rotate' | 'pan'>('rotate')

  const pan = useCallback((dx: number, dy: number, height: number) => {
    const o = orbitRef.current
    // Метров на пиксель у точки облёта: поле зрения камеры около 35°.
    const mpp = (o.range * 0.63) / Math.max(1, height)
    const h = (o.heading * Math.PI) / 180
    // Карта едет за курсором: центр смещается против движения по экрану.
    const east = -dx * Math.cos(h) * mpp + dy * Math.sin(h) * mpp
    const north = dx * Math.sin(h) * mpp + dy * Math.cos(h) * mpp
    o.lat += north / METERS_PER_DEG_LAT
    o.lng += east / (METERS_PER_DEG_LAT * Math.cos((o.lat * Math.PI) / 180))
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    dragMode.current = e.button === 2 || e.shiftKey ? 'pan' : 'rotate'
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const prev = pointers.current.get(e.pointerId)
      if (!prev) return
      const height = e.currentTarget.clientHeight
      const o = orbitRef.current

      if (pointers.current.size >= 2) {
        // Щипок: меняется расстояние между пальцами — приближаем; середина
        // между пальцами едет — сдвигаем карту.
        const [a, b] = [...pointers.current.values()]
        const before = Math.hypot(a.x - b.x, a.y - b.y)
        const midBefore = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const [c, d] = [...pointers.current.values()]
        const after = Math.hypot(c.x - d.x, c.y - d.y)
        if (before > 0 && after > 0) o.range = clamp((o.range * before) / after, MIN_RANGE, MAX_RANGE)
        pan((c.x + d.x) / 2 - midBefore.x, (c.y + d.y) / 2 - midBefore.y, height)
      } else {
        const dx = e.clientX - prev.x
        const dy = e.clientY - prev.y
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (dragMode.current === 'pan') {
          pan(dx, dy, height)
        } else {
          o.heading = (o.heading - dx * ROTATE_DEG_PER_PX + 360) % 360
          o.tilt = clamp(o.tilt - dy * ROTATE_DEG_PER_PX, 0, MAX_TILT)
        }
      }
      applyOrbit()
    },
    [applyOrbit, pan],
  )

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
  }, [])

  // Колесо вешаем нативно: React подписывает wheel пассивно, и
  // preventDefault не удержал бы страницу под модалкой от прокрутки.
  useEffect(() => {
    if (status !== 'open') return
    const mount = mountRef.current
    if (!mount) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const o = orbitRef.current
      o.range = clamp(o.range * Math.exp(e.deltaY * 0.0015), MIN_RANGE, MAX_RANGE)
      applyOrbit()
    }
    mount.addEventListener('wheel', onWheel, { passive: false })
    return () => mount.removeEventListener('wheel', onWheel)
  }, [status, applyOrbit])

  useEffect(() => {
    if (status !== 'open') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [status, close])

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={status === 'checking'}
        className="inline-flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-400/10 px-4 py-2.5 text-sm font-medium transition hover:bg-sky-400/20 disabled:cursor-wait disabled:opacity-60"
      >
        <span aria-hidden>🌍</span>
        {status === 'checking' ? 'Открываю 3D-карту…' : 'Посмотреть на 3D-карте Google'}
      </button>

      {status === 'limit' && (
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          3D-карта на сегодня недоступна — загляните завтра. Модель с солнцем и тенью открывается
          как обычно.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          Не получилось открыть 3D-карту. Проверьте интернет и попробуйте ещё раз.
        </p>
      )}

      {status === 'open' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — 3D-карта Google`}
          className="fixed inset-0 z-[100] flex flex-col bg-black/80 sm:p-6"
          onClick={close}
        >
          <div
            className="relative mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[#0e1116] shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm font-semibold text-white">{title} — 3D-карта Google</div>
              <button
                type="button"
                onClick={close}
                aria-label="Закрыть"
                className="rounded-lg px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div ref={mountRef} className="relative min-h-0 flex-1">
              {/* Прозрачный слой ловит жесты облёта поверх карты. Снизу
                  оставлен зазор, чтобы подпись Google оставалась видна. */}
              <div
                className="absolute inset-x-0 top-0 bottom-8 z-10 cursor-grab touch-none active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <p className="text-xs text-white/50">
                <span className="hidden sm:inline">
                  Тяните — вращать · колесо — приблизить · правая кнопка — сдвинуть
                </span>
                <span className="sm:hidden">Палец — вращать · два пальца — приблизить и сдвинуть</span>
              </p>
              <button
                type="button"
                onClick={() => setTopView((v) => !v)}
                aria-pressed={topView}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs ${
                  topView
                    ? 'border-transparent bg-amber-400 font-semibold text-[#191308]'
                    : 'border-white/15 text-white hover:bg-white/10'
                }`}
              >
                Вид сверху
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
