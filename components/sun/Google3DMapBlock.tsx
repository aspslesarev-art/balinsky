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

export function Google3DMapBlock({ apiKey, view, title }: Google3DMapBlockProps) {
  const [status, setStatus] = useState<Status>('idle')
  const mountRef = useRef<HTMLDivElement | null>(null)
  const close = useCallback(() => setStatus('idle'), [])

  const open = useCallback(async () => {
    setStatus('checking')
    try {
      const res = await fetch('/api/map3d/open', { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as { allowed?: boolean }
      setStatus(body.allowed ? 'open' : 'limit')
    } catch {
      setStatus('error')
    }
  }, [])

  // Карта создаётся, когда модалка смонтирована, и уничтожается при закрытии.
  useEffect(() => {
    if (status !== 'open') return
    const mount = mountRef.current
    if (!mount) return
    let cancelled = false
    let map: HTMLElement | null = null

    ;(async () => {
      await loadGoogleMaps(apiKey)
      const { Map3DElement, Model3DElement } = (await google.maps.importLibrary(
        'maps3d',
      )) as google.maps.Maps3DLibrary
      if (cancelled) return

      const element = new Map3DElement({
        center: { lat: view.latitude, lng: view.longitude, altitude: 100 },
        // Камера с севера смотрит на юг: за комплексом виден океан.
        range: 1100,
        tilt: 68,
        heading: 190,
        mode: 'SATELLITE',
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
      mount.append(element)
      map = element
    })().catch((e: unknown) => {
      console.error('[google-3d] map failed', e)
      if (!cancelled) setStatus('error')
    })

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [status, apiKey, view])

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
            <div ref={mountRef} className="min-h-0 flex-1" />
          </div>
        </div>
      )}
    </>
  )
}
