'use client'

// Mobile-bottom + desktop-side sticky CTA that surfaces price + the
// Telegram-to-manager button on every villa / apartment / complex
// detail page. Stays out of the way for the first ~600 px of scroll
// (so the hero stays clean) and slides into view afterwards.

import { useEffect, useState } from 'react'
import { Send, Heart } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyContext'
import { formatPrice } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

export function StickyContactBar({
  priceUsd,
  contactHref,
  title,
  lang = 'ru',
  showFavourite = false,
  onFavouriteClick,
  isFavourite = false,
}: {
  priceUsd: number | null
  contactHref: string
  title: string
  lang?: Lang
  showFavourite?: boolean
  onFavouriteClick?: () => void
  isFavourite?: boolean
}) {
  const { currency } = useCurrency()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Hide until the visitor scrolls past the hero / price card. The
    // 600 px threshold matches the height of the photo gallery + first
    // info row on mobile. Re-evaluated on every scroll, throttled by rAF.
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 600)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const priceText = priceUsd != null && Number.isFinite(priceUsd)
    ? formatPrice(priceUsd, currency)
    : (lang === 'en' ? 'Price on request' : 'Цена по запросу')
  const ctaLabel = lang === 'en' ? 'Contact manager' : 'Связаться с менеджером'

  return (
    <div
      aria-hidden={!visible}
      className={`
        fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3
        bg-white/95 backdrop-blur border-t border-[var(--color-border)]
        transition-transform duration-200 ease-out
        ${visible ? 'translate-y-0' : 'translate-y-full'}
        md:hidden
      `}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] truncate">{title}</div>
          <div className="text-[17px] font-semibold text-[#111827] leading-tight">{priceText}</div>
        </div>
        {showFavourite && (
          <button
            type="button"
            onClick={onFavouriteClick}
            aria-label={lang === 'en' ? 'Save' : 'В избранное'}
            className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border ${
              isFavourite
                ? 'border-[#1F8B5F] text-[#1F8B5F] bg-[#1F8B5F]/10'
                : 'border-[var(--color-border)] text-[#111827] bg-white'
            }`}
          >
            <Heart size={20} fill={isFavourite ? 'currentColor' : 'none'} />
          </button>
        )}
        <a
          href={contactHref}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#229ED9] text-white text-[14px] font-semibold no-underline"
        >
          <Send size={16} />
          {ctaLabel}
        </a>
      </div>
    </div>
  )
}
