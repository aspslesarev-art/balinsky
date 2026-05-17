'use client'

import { Heart } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useWishlist } from './WishlistContext'
import type { WishlistItem } from '@/lib/wishlist'

// Plain-object input — no thunk. RSC serialisation refuses functions, so
// detail pages (server components) can't pass a constructor. We instead
// take the snapshot fields and stamp savedAt inside toggle().
export type WishlistInput = Omit<WishlistItem, 'savedAt'>

// Heart toggle that lives over the photo slider on each card. Clicking
// stops propagation + prevents default so the card's wrapping <Link>
// doesn't navigate while the user just wanted to save it.
export function WishlistButton({
  item,
  className = '',
  size = 'md',
}: {
  item: WishlistInput
  className?: string
  size?: 'sm' | 'md'
}) {
  const { has, toggle, ready } = useWishlist()
  const saved = ready ? has(item.kind, item.slug) : false
  const dim = size === 'sm' ? 32 : 38
  const icon = size === 'sm' ? 16 : 18
  const pathname = usePathname() ?? ''
  const isEn = pathname.startsWith('/en')
  const labelSave   = isEn ? 'Add to favorites'    : 'В избранное'
  const labelRemove = isEn ? 'Remove from favorites' : 'Удалить из избранного'
  return (
    <button
      type="button"
      aria-label={saved ? labelRemove : labelSave}
      aria-pressed={saved}
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
        toggle({ ...item, savedAt: new Date().toISOString() })
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
