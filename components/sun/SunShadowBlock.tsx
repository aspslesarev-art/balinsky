'use client'

// Публичный блок «Солнце и тень» на странице ЖК.
//
// Ради скорости страницы и Core Web Vitals сам блок — это кнопка и текст:
// ни three.js, ни спутниковая подложка при загрузке страницы не скачиваются.
// Сцена (~380 КБ) подтягивается отдельным чанком только после клика, поэтому
// на LCP и TBT страницы ЖК блок не влияет.

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'

import type { SitePlan } from '@/lib/complex-sun'
import type { ModelHeights } from './sun-model'

const SunScene = dynamic(() => import('./SunScene').then((m) => m.SunScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-white/60">
      Загружаю 3D-модель…
    </div>
  ),
})

export type SunShadowBlockProps = {
  plan: SitePlan
  latitude: number
  longitude: number
  rowAzimuth: number
  heights: ModelHeights
  title: string
}

export function SunShadowBlock({
  plan,
  latitude,
  longitude,
  rowAzimuth,
  heights,
  title,
}: SunShadowBlockProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
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
  }, [open, close])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2.5 text-sm font-medium transition hover:bg-amber-400/20"
      >
        <span aria-hidden>☀️</span>
        Посмотреть солнце и тень в 3D
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — солнце и тень`}
          className="fixed inset-0 z-[100] flex flex-col bg-black/80 sm:p-6"
          onClick={close}
        >
          <div
            className="relative mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[#0e1116] shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm font-semibold text-white">{title} — солнце и тень</div>
              <button
                type="button"
                onClick={close}
                aria-label="Закрыть"
                className="rounded-lg px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <SunScene
                plan={plan}
                latitude={latitude}
                longitude={longitude}
                rowAzimuth={rowAzimuth}
                heights={heights}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
