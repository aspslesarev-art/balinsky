'use client'

import Link from 'next/link'
import { Heart, ChevronRight } from 'lucide-react'
import { useWishlist } from '../WishlistContext'

// Строка «Избранное» в кабинете. Избранное живёт в браузере (localStorage),
// поэтому число и превью — на клиенте; до загрузки строка без цифры.

function objectsRu(n: number): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} объект`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} объекта`
  return `${n} объектов`
}

export function WishlistRow({ className }: { className: string }) {
  const { items, ready } = useWishlist()
  const thumbs = items.filter(i => i.photo).slice(0, 2)
  return (
    <Link href="/ru/izbrannoe" className={className}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Heart size={20} strokeWidth={2} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] font-semibold text-[var(--color-text)]">Избранное</span>
        <span className="text-[14px] text-[var(--color-text-muted)]">
          {!ready ? ' ' : items.length ? objectsRu(items.length) : 'Пока пусто. Сохраняйте объекты сердечком'}
        </span>
      </span>
      {thumbs.length > 0 && (
        <span className="hidden gap-2 sm:flex" aria-hidden>
          {thumbs.map(t => (
            // eslint-disable-next-line @next/next/no-img-element -- превью из избранного, адреса с разных CDN
            <img key={t.kind + t.slug} src={t.photo!} alt="" className="h-12 w-[72px] rounded-md object-cover" />
          ))}
        </span>
      )}
      <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden />
    </Link>
  )
}
