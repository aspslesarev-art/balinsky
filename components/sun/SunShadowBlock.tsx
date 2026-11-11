'use client'

import { MEDIA_TILE, MediaTileLabel } from '@/components/media-tile'
import type { Wind } from '@/lib/complex-access'
// Публичный блок «Солнце и тень» на странице ЖК.
//
// Ради скорости страницы и Core Web Vitals сам блок — это кнопка и текст:
// ни three.js, ни спутниковая подложка при загрузке страницы не скачиваются.
// Сцена (~380 КБ) подтягивается отдельным чанком только после клика, поэтому
// на LCP и TBT страницы ЖК блок не влияет.

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sun } from 'lucide-react'

import type { SitePlan } from '@/lib/complex-sun-plan'
import type { ModelHeights } from './sun-model'
import type { Placement } from './SunScene'

const SunScene = dynamic(() => import('./SunScene').then((m) => m.SunScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-white/60">
      3D…
    </div>
  ),
})

export type SunShadowBlockProps = {
  plan: SitePlan
  latitude: number
  longitude: number
  placement: Placement
  heights: ModelHeights
  title: string
  /** Russian UI on /ru, English on every other locale. */
  en?: boolean
  /** Компактная плашка для полосы кнопок над фото (медиаблок вверху страницы). */
  chip?: boolean
  /** Роза ветров у объекта — струи ветра в сцене. */
  wind?: Wind | null
  /** Плитка в ряду «фишек» под главным фото; cover — картинка под затемнением. */
  tile?: { cover?: string | null }
  /** Сцена сразу, без кнопки и своего окна — вкладка в окне медиаблока. */
  inline?: boolean
}

export function SunShadowBlock({
  plan,
  latitude,
  longitude,
  placement,
  heights,
  title,
  en = false,
  chip = false,
  tile,
  wind = null,
  inline = false,
}: SunShadowBlockProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open || inline) return
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
  }, [open, close, inline])

  if (inline) {
    return (
      <div className="mx-auto h-full w-full max-w-6xl overflow-hidden rounded-lg bg-[#0e1116]">
        <SunScene en={en} plan={plan} latitude={latitude} longitude={longitude} placement={placement} heights={heights} wind={wind} />
      </div>
    )
  }

  return (
    <>
      {tile ? (
        <button type="button" onClick={() => setOpen(true)} className={MEDIA_TILE} aria-label={en ? 'Sun & wind' : 'Солнце и ветер'}>
          {tile.cover && <img src={tile.cover} alt="" className="w-full h-full object-cover" />}
          <MediaTileLabel icon={<Sun size={18} aria-hidden />}>{en ? 'Sun & wind' : 'Солнце и ветер'}</MediaTileLabel>
        </button>
      ) : chip ? (
        <button type="button" onClick={() => setOpen(true)} className="text-white text-[14px] px-4 py-2.5 inline-flex items-center gap-1.5 hover:bg-white/[0.12] focus-visible:bg-white/[0.12] transition-colors disabled:cursor-wait disabled:opacity-70">
          <Sun size={15} aria-hidden />
          {en ? 'Sun & wind' : 'Солнце и ветер'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2.5 text-sm font-medium transition hover:bg-amber-400/20"
        >
          <span aria-hidden>☀️</span>
          {en ? 'See sun and shade in 3D' : 'Посмотреть солнце и тень в 3D'}
        </button>
      )}

      {open && createPortal((
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — ${en ? (wind ? 'sun and wind' : 'sun and shade') : (wind ? 'солнце и ветер' : 'солнце и тень')}`}
          className="fixed inset-0 z-[100] flex flex-col bg-black/80 sm:p-6"
          onClick={close}
        >
          <div
            className="relative mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[#0e1116] shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm font-semibold text-white">{title} — {en ? (wind ? 'sun and wind' : 'sun and shade') : (wind ? 'солнце и ветер' : 'солнце и тень')}</div>
              <button
                type="button"
                onClick={close}
                aria-label={en ? 'Close' : 'Закрыть'}
                className="rounded-lg px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <SunScene
                en={en}
                plan={plan}
                latitude={latitude}
                longitude={longitude}
                placement={placement}
                heights={heights}
                wind={wind}
              />
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  )
}
