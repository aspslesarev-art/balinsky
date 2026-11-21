'use client'

import Link from 'next/link'
import { detectLang, pickCopy, switchLangPath } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useWishlist } from './WishlistContext'

export const WISHLIST_LABEL = { ru: 'Избранное', en: 'Shortlist', id: 'Favorit', fr: 'Favoris', de: 'Favoriten', zh: '收藏', nl: 'Favorieten', ban: 'Kaplihan', pl: 'Ulubione', uk: 'Обране' }

// Шапка «Журнал»: сердце + число. 'text' — с подписью «Избранное 3»
// (подпись с xl, на узком десктопе только сердце и число), 'icon' — телефон,
// число мелко у сердца.
export function WishlistHeaderLink({ className = '', variant = 'text' }: { className?: string; variant?: 'text' | 'icon' }) {
  const { items, ready } = useWishlist()
  const pathname = usePathname() ?? ''
  const lang = detectLang(pathname)
  const href = switchLangPath('/ru/izbrannoe', lang)
  const label = pickCopy(WISHLIST_LABEL, lang)
  const count = ready ? items.length : 0
  const shown = count > 99 ? '99+' : String(count)
  const aria = count > 0 ? `${label}, ${count}` : label

  if (variant === 'icon') {
    return (
      <Link
        href={href}
        aria-label={aria}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#0F1A15] no-underline transition-colors duration-[120ms] hover:text-[var(--color-primary-pressed)] ${className}`}
      >
        <Heart size={20} strokeWidth={2} aria-hidden />
        {count > 0 && (
          <span aria-hidden className="absolute right-1 top-1.5 text-[11px] font-semibold leading-none tabular-nums">{shown}</span>
        )}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      aria-label={aria}
      className={`inline-flex h-11 items-center gap-2 rounded-sm text-[14px] text-[#0F1A15] no-underline transition-colors duration-[120ms] hover:text-[var(--color-primary-pressed)] ${className}`}
    >
      <Heart size={18} strokeWidth={2} aria-hidden />
      <span className="hidden xl:inline">{label}</span>
      {count > 0 && <span className="tabular-nums text-[#6B7570]">{shown}</span>}
    </Link>
  )
}
