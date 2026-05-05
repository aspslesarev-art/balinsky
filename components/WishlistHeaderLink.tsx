'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useWishlist } from './WishlistContext'

// Heart icon + count badge in the header. Tap navigates to the
// shortlist page in the visitor's current language.
export function WishlistHeaderLink({ className = '' }: { className?: string }) {
  const { items, ready } = useWishlist()
  const pathname = usePathname() ?? ''
  const isEn = pathname.startsWith('/en')
  const href = isEn ? '/en/favourites' : '/ru/izbrannoe'
  const label = isEn ? 'Shortlist' : 'Избранное'
  const count = items.length
  return (
    <Link
      href={href}
      aria-label={label}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-text)] hover:bg-[var(--color-search-bg)] transition-colors no-underline ${className}`}
    >
      <Heart size={18} strokeWidth={2} fill={ready && count > 0 ? 'currentColor' : 'none'} />
      {ready && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-semibold">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
