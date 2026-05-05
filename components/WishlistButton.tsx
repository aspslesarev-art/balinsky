'use client'

import { Heart } from 'lucide-react'
import { useWishlist } from './WishlistContext'
import type { WishlistItem } from '@/lib/wishlist'

// Heart toggle that lives over the photo slider on each card. Clicking
// stops propagation + prevents default so the card's wrapping <Link>
// doesn't navigate while the user just wanted to save it.
export function WishlistButton({
  item,
  className = '',
  size = 'md',
}: {
  // We want the snapshot to be cheap to build at the call site, so the
  // button accepts a constructor-thunk OR a ready-made item. Most cards
  // already have all the fields handy and pass an object directly.
  item: WishlistItem | (() => WishlistItem)
  className?: string
  size?: 'sm' | 'md'
}) {
  const { has, toggle, ready } = useWishlist()
  const probe = typeof item === 'function' ? null : item
  const saved = ready && probe ? has(probe.kind, probe.slug) : false
  const dim = size === 'sm' ? 32 : 38
  const icon = size === 'sm' ? 16 : 18
  return (
    <button
      type="button"
      aria-label={saved ? 'Удалить из избранного' : 'В избранное'}
      aria-pressed={saved}
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
        const it = typeof item === 'function' ? item() : item
        toggle(it)
      }}
      className={`inline-flex items-center justify-center rounded-full transition-colors backdrop-blur-sm ${
        saved
          ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-pressed)]'
          : 'bg-white/85 text-[#1A1F1C] hover:bg-white'
      } shadow-[0_1px_3px_rgba(0,0,0,0.12)] ${className}`}
      style={{ width: dim, height: dim }}
    >
      <Heart
        size={icon}
        strokeWidth={2}
        // `fill` only applies to the saved state; lucide accepts
        // currentColor so the colour matches the surrounding text.
        fill={saved ? 'currentColor' : 'none'}
        className="pointer-events-none"
      />
    </button>
  )
}
