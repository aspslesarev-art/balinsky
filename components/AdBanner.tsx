'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Banner } from '@/lib/banners'

// Compact, non-intrusive ad slot rendered above the footer on every
// public page. Marked as advertisement per Russian law (152-ФЗ / закон
// «О рекламе»). Fires impression once per mount; click handler ships a
// beacon before navigation so we don't lose the event mid-navigate.
export function AdBanner({ banner }: { banner: Banner }) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    // sendBeacon survives page-unload + costs no JS time on main thread.
    try {
      const blob = new Blob([JSON.stringify({ banner_id: banner.id })], { type: 'application/json' })
      navigator.sendBeacon('/api/ad/impression', blob)
    } catch {
      fetch('/api/ad/impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banner_id: banner.id }),
        keepalive: true,
      }).catch(() => {})
    }
  }, [banner.id])

  const handleClick = () => {
    try {
      const blob = new Blob([JSON.stringify({ banner_id: banner.id })], { type: 'application/json' })
      navigator.sendBeacon('/api/ad/click', blob)
    } catch { /* noop, navigation continues anyway */ }
  }

  return (
    <aside className="border-t border-[var(--color-border)] bg-[var(--color-search-bg)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3">
        <a
          href={banner.linkUrl}
          target="_blank"
          rel="sponsored noopener"
          onClick={handleClick}
          className="group flex items-center gap-3 sm:gap-4 no-underline text-[var(--color-text)] hover:opacity-95 transition-opacity"
        >
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1.5 py-0.5 bg-white">
            Реклама
          </span>

          <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white">
            <Image
              src={banner.imageUrl}
              alt={banner.alt}
              fill
              sizes="80px"
              loading="lazy"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[14px] sm:text-[15px] font-medium leading-snug line-clamp-2">
              {banner.headline}
            </div>
            {banner.sponsor && (
              <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                {banner.sponsor}
              </div>
            )}
          </div>

          <span className="hidden sm:inline-flex shrink-0 items-center gap-1 text-[12px] text-[var(--color-primary)] group-hover:text-[var(--color-primary-pressed)]">
            Подробнее →
          </span>
        </a>
      </div>
    </aside>
  )
}
