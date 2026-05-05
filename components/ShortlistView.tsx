'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Heart, X, Trash2, Send, Columns3, Check } from 'lucide-react'
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
    selectForCompare: 'Выбрать для сравнения',
    compareSelected: (n: number) => `Сравнить выбранные · ${n}`,
    compareHint: 'Выбрано для сравнения. Можно сравнить до 4 объектов.',
    cancelSelection: 'Отмена',
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
    selectForCompare: 'Select for comparison',
    compareSelected: (n: number) => `Compare selected · ${n}`,
    compareHint: 'Selected for comparison. Up to 4 listings.',
    cancelSelection: 'Cancel',
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

const MAX_COMPARE = 4

export function ShortlistView({ lang }: { lang: Lang }) {
  const { items, ready, remove, clear } = useWishlist()
  const { currency } = useCurrency()
  const c = COPY[lang]
  const home = lang === 'en' ? '/en' : '/ru'
  const compareHref = lang === 'en' ? '/en/compare' : '/ru/sravnenie'

  // Multi-select for comparison. Stored as `${kind}:${slug}` strings so
  // toggling is O(1) and ids are stable across renders. We also drop
  // ids that no longer exist in the wishlist (e.g. the user removed a
  // saved object while it was selected).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const validSelected = useMemo(() => {
    const valid = new Set<string>()
    for (const it of items) {
      const id = `${it.kind}:${it.slug}`
      if (selectedIds.has(id)) valid.add(id)
    }
    return valid
  }, [items, selectedIds])
  const toggleSelect = (kind: WishlistKind, slug: string) => {
    const id = `${kind}:${slug}`
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_COMPARE) next.add(id)
      return next
    })
  }
  // Build the ?items= query for the compare page from the current
  // selection, preserving the order users picked them in.
  const compareQuery = useMemo(() => {
    const orderedItems = items.filter(it => validSelected.has(`${it.kind}:${it.slug}`))
    return orderedItems.map(it => `${it.kind[0]}.${it.slug}`).join(',')
  }, [items, validSelected])

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
              const id = `${item.kind}:${item.slug}`
              const isSelected = validSelected.has(id)
              const canSelectMore = validSelected.size < MAX_COMPARE
              return (
                <li key={id} className="relative">
                  <Link
                    href={detailHref(item, lang)}
                    className={`block bg-white rounded-2xl border overflow-hidden no-underline text-[var(--color-text)] transition-colors ${
                      isSelected
                        ? 'border-[var(--color-primary)] shadow-[0_0_0_2px_var(--color-primary)_inset]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                    }`}
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
                  {/* Compare-checkbox in the bottom-left corner of the
                      photo. Click stops propagation so the wrapping
                      <Link> doesn't navigate. Disabled for the 5th item
                      onwards once the cap is reached. */}
                  <button
                    type="button"
                    aria-label={c.selectForCompare}
                    aria-pressed={isSelected}
                    disabled={!isSelected && !canSelectMore}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSelect(item.kind, item.slug) }}
                    className={`absolute bottom-[26%] left-3 z-10 inline-flex items-center justify-center w-7 h-7 rounded-md border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                        : 'bg-white/90 border-[#d1d5db] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </button>
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
        {/* Floating bottom bar appears only when ≥2 items are ticked.
            Sticks to the bottom of the viewport, doesn't overlap mobile
            footer because the wishlist page sits above it. */}
        {ready && validSelected.size >= 2 && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40 max-w-[680px] w-[calc(100%-32px)]">
            <div className="rounded-full bg-[#1A1F1C] text-white shadow-[0_10px_32px_-8px_rgba(0,0,0,0.35)] flex items-center justify-between gap-3 pl-5 pr-2 py-2">
              <span className="text-[13px] hidden sm:inline opacity-80">{c.compareHint}</span>
              <span className="text-[13px] sm:hidden opacity-80">{validSelected.size}/{MAX_COMPARE}</span>
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-[12px] text-white/70 hover:text-white"
                >
                  {c.cancelSelection}
                </button>
                <Link
                  href={`${compareHref}?items=${encodeURIComponent(compareQuery)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline"
                >
                  <Columns3 size={14} /> {c.compareSelected(validSelected.size)}
                </Link>
              </div>
            </div>
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
