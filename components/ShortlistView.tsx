'use client'

import Link from 'next/link'
import { Heart, X, Trash2, Send } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useWishlist } from './WishlistContext'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { botLink } from '@/lib/bot-link'
import type { Lang } from '@/lib/i18n'
import type { WishlistItem, WishlistKind } from '@/lib/wishlist'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Избранное',
    h1: 'Избранное',
    empty: 'Пока ничего не добавлено. Откройте каталог и нажмите на сердце у любого объекта.',
    countOne: 'объект', countFew: 'объекта', countMany: 'объектов',
    clear: 'Очистить всё',
    sendToBot: 'Отправить шортлист в Telegram',
    remove: 'Убрать',
    villasLink: 'К виллам',
    apartmentsLink: 'К апартаментам',
    complexesLink: 'К жилым комплексам',
    bedrooms: 'BR',
  },
  en: {
    home: 'Home',
    crumb: 'Shortlist',
    h1: 'Shortlist',
    empty: 'Nothing saved yet. Open a catalogue and tap the heart on any listing.',
    countOne: 'item', countFew: 'items', countMany: 'items',
    clear: 'Clear all',
    sendToBot: 'Send shortlist to Telegram',
    remove: 'Remove',
    villasLink: 'Browse villas',
    apartmentsLink: 'Browse apartments',
    complexesLink: 'Browse complexes',
    bedrooms: 'BR',
  },
} as const

type Copy = { countOne: string; countFew: string; countMany: string }
function plural(n: number, lang: Lang, copy: Copy): string {
  if (lang === 'en') return n === 1 ? copy.countOne : copy.countMany
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return copy.countOne
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return copy.countFew
  return copy.countMany
}

function detailHref(item: WishlistItem, lang: Lang): string {
  switch (item.kind) {
    case 'villa':     return lang === 'en' ? `/en/villas/o/${item.slug}` : `/ru/villy/o/${item.slug}`
    case 'apartment': return lang === 'en' ? `/en/apartments/o/${item.slug}` : `/ru/apartamenty/o/${item.slug}`
    case 'complex':   return lang === 'en' ? `/en/complexes/o/${item.slug}` : `/ru/zhilye-kompleksy/o/${item.slug}`
    case 'rental':    return lang === 'en' ? `/en/rental/o/${item.slug}` : `/ru/arenda/o/${item.slug}`
  }
}

function kindLabel(kind: WishlistKind, lang: Lang): string {
  if (lang === 'en') {
    return ({ villa: 'Villa', apartment: 'Apartment', complex: 'Complex', rental: 'Rental' } as const)[kind]
  }
  return ({ villa: 'Вилла', apartment: 'Апартаменты', complex: 'Комплекс', rental: 'Аренда' } as const)[kind]
}

export function ShortlistView({ lang }: { lang: Lang }) {
  const { items, ready, remove, clear } = useWishlist()
  const { currency } = useCurrency()
  const c = COPY[lang]
  const home = lang === 'en' ? '/en' : '/ru'

  // Build a single payload that the visitor sends via the bot. Each item
  // becomes a deep-linkable URL in the message — the bot's /start payload
  // is too short for a multi-item list, so we use Telegram's message-share
  // intent (t.me/share/url) to seed the manager's chat with the list.
  const sharePayload = items.map(i => `https://balinsky.info${detailHref(i, lang)}`).join('\n')
  const shareHref = items.length > 0
    ? `https://t.me/share/url?url=${encodeURIComponent(sharePayload)}&text=${encodeURIComponent(c.sendToBot)}`
    : botLink('manager', '')

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        <div className="flex items-end justify-between gap-3 mt-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-[var(--color-text)]">
              {c.h1}
            </h1>
            {ready && items.length > 0 && (
              <div className="text-[14px] text-[var(--color-text-muted)] mt-1">
                {items.length} {plural(items.length, lang, c)}
              </div>
            )}
          </div>
          {ready && items.length > 0 && (
            <div className="flex items-center gap-2">
              <a
                href={shareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline"
              >
                <Send size={14} /> {c.sendToBot}
              </a>
              <button
                type="button"
                onClick={() => { if (confirm(lang === 'en' ? 'Clear the whole shortlist?' : 'Очистить весь шортлист?')) clear() }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-search-bg)]"
              >
                <Trash2 size={14} /> {c.clear}
              </button>
            </div>
          )}
        </div>

        {!ready ? null : items.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-12 text-center">
            <Heart size={36} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
            <div className="text-[15px] text-[var(--color-text)] max-w-md mx-auto mb-6">{c.empty}</div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Link href={lang === 'en' ? '/en/villas' : '/ru/villy'}      className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-medium no-underline">{c.villasLink}</Link>
              <Link href={lang === 'en' ? '/en/apartments' : '/ru/apartamenty'} className="px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline">{c.apartmentsLink}</Link>
              <Link href={lang === 'en' ? '/en/complexes' : '/ru/zhilye-kompleksy'} className="px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline">{c.complexesLink}</Link>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => {
              const price = item.priceUsd != null && Number.isFinite(item.priceUsd)
                ? formatPrice(item.priceUsd, currency)
                : null
              return (
                <li key={`${item.kind}:${item.slug}`} className="relative">
                  <Link
                    href={detailHref(item, lang)}
                    className="block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                  >
                    <div className="relative aspect-[4/3] bg-[var(--color-search-bg)]">
                      {item.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photo} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
                      )}
                      <span className="absolute top-3 left-3 text-[11px] uppercase tracking-wide bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 font-semibold">
                        {kindLabel(item.kind, lang)}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-[16px] font-semibold leading-snug mb-2 line-clamp-2">{item.title}</h3>
                      {price && <div className="text-[15px] font-semibold mb-1">{price}</div>}
                      <div className="text-[13px] text-[var(--color-text-muted)] flex items-center gap-3 flex-wrap">
                        {item.bedrooms != null && <span>{item.bedrooms} {c.bedrooms}</span>}
                        {item.district && <span>{item.district}</span>}
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label={c.remove}
                    onClick={() => remove(item.kind, item.slug)}
                    className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-[#1A1F1C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  >
                    <X size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
