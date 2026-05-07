'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Send, ArrowRight, FileText, MapPinned, UserRound, Lock } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { botLink } from '@/lib/bot-link'
import { ReserveButton } from './ReserveButton'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    buyChat: 'Купить — чат в Telegram',
    buySeller: 'Купить — связаться с продавцом',
    perSqm: '/ м²',
    priceUpdated: (d: string) => `Цена обновлена ${d}`,
    reservedTitle: 'Объект сейчас забронирован',
    reservedUntil: (d: string) => `Hold действует до ${d}. Если бронь снимется — напишем менеджеру.`,
    chipsResale: [
      { icon: 'user', label: 'Прямой контакт продавца' },
      { icon: 'file', label: 'Документы по объекту' },
    ],
    chipsPrimary: [
      { icon: 'file', label: 'Документы и due diligence' },
      { icon: 'map',  label: 'Мастер-план и планировки' },
      { icon: 'user', label: 'Прямой контакт застройщика' },
    ],
    locale: 'ru-RU',
  },
  en: {
    buyChat: 'Buy — chat on Telegram',
    buySeller: 'Buy — contact seller',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Price updated ${d}`,
    reservedTitle: 'Currently reserved',
    reservedUntil: (d: string) => `Hold expires on ${d}. If the hold is released we will message the manager.`,
    chipsResale: [
      { icon: 'user', label: 'Direct seller contact' },
      { icon: 'file', label: 'Property documents' },
    ],
    chipsPrimary: [
      { icon: 'file', label: 'Documents & due diligence' },
      { icon: 'map',  label: 'Master plan & layouts' },
      { icon: 'user', label: 'Direct developer contact' },
    ],
    locale: 'en-GB',
  },
} as const

// Single bordered container that joins the price + the two CTAs +
// trust-chips on the villa / apartment detail page. Replaces the
// previous mix of a free-floating DetailPriceBlock + pill BuyButton +
// VillaPresentationButton-as-pill row.
//
// Layout: 2-column grid on ≥md, single column on phone with primary
// CTA pinned to the top per spec.
export function PriceCtaCard({
  priceUsd,
  pricePerSqmUsd = null,
  updatedAt = null,
  managerId = null,
  sellerUrl = null,
  presentationButton,
  // Reservation context — when these are set, render the "Зарезервировать"
  // button. When `reservedUntil` is set, swap CTAs for an "уже забронирован"
  // banner so two visitors don't both think they're holding the unit.
  listingKind = null,
  listingId = null,
  listingSlug = null,
  listingTitle = null,
  reservedUntil = null,
}: {
  priceUsd: number
  pricePerSqmUsd?: number | null
  updatedAt?: string | null
  managerId?: string | null
  sellerUrl?: string | null
  presentationButton: ReactNode
  listingKind?: 'villa' | 'apartment' | null
  listingId?: string | null
  listingSlug?: string | null
  listingTitle?: string | null
  reservedUntil?: string | null
}) {
  const { currency } = useCurrency()
  const pathname = usePathname() ?? ''
  const lang: Lang = pathname.startsWith('/en') ? 'en' : 'ru'
  const c = COPY[lang]
  const main = formatPrice(priceUsd, currency)
  const perSqm = pricePerSqmUsd != null && Number.isFinite(pricePerSqmUsd) && pricePerSqmUsd > 0
    ? formatPrice(pricePerSqmUsd, currency)
    : null
  const updated = updatedAt ? formatUpdated(updatedAt, c.locale) : null

  const isResale = !!sellerUrl
  const buyHref = isResale ? sellerUrl! : botLink('manager', managerId ?? '')
  const buyLabel = isResale ? c.buySeller : c.buyChat

  return (
    <div className="rounded-2xl bg-white border border-[var(--color-border)] px-5 py-5 md:px-6 md:py-[22px] grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 md:gap-6 md:items-center">
      {/* LEFT — price */}
      <div className="min-w-0">
        <div className="text-[30px] md:text-[32px] font-semibold tracking-[-0.02em] leading-none text-[#1A1F1C] tabular-nums">
          {main}
        </div>
        {perSqm && (
          <div className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
            {perSqm} {c.perSqm}
          </div>
        )}
        {updated && (
          <div className="mt-2 text-[12px] text-[var(--color-text-muted)]">
            {c.priceUpdated(updated)}
          </div>
        )}
      </div>

      {/* RIGHT — CTAs + trust chips. Order on mobile uses CSS so the
          primary button stays at the top per spec. */}
      <div className="flex flex-col gap-3 md:items-end">
        {reservedUntil ? (
          // The unit is already on a 14-day hold. Hide the buy / reserve
          // CTAs so two visitors don't think they both have it. They can
          // still reach the operator via the bot if they want to be
          // notified when the hold lifts.
          <div className="w-full md:w-auto md:max-w-[420px] rounded-[10px] border border-[#E5E7EB] bg-[#FEF3C7] text-[#92400E] px-4 py-3 flex items-start gap-2">
            <Lock size={16} strokeWidth={1.6} className="shrink-0 mt-0.5" />
            <div className="text-[13px] leading-snug">
              <div className="font-semibold mb-0.5">{c.reservedTitle}</div>
              <div>{c.reservedUntil(formatUpdated(reservedUntil, c.locale) ?? '')}</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse md:flex-row gap-2 w-full md:w-auto">
            {/* Reserve flow — only shown when the listing context is
                provided. Outside the resale path (resale already routes
                to the seller, doesn't need a hold from us). */}
            {!isResale && listingKind && listingId && listingSlug && (
              <ReserveButton
                listingKind={listingKind}
                listingId={listingId}
                listingSlug={listingSlug}
                listingTitle={listingTitle}
                listingPriceUsd={priceUsd}
              />
            )}
            {presentationButton}
            <Link
              href={buyHref}
              target="_blank"
              rel={isResale ? 'noopener noreferrer' : 'noopener'}
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 min-h-[54px] py-2 px-6 rounded-[10px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] md:text-[16px] font-semibold text-center leading-tight transition-colors no-underline shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_16px_-8px_rgba(31,90,52,0.6)]"
            >
              <Send size={18} strokeWidth={1.6} />
              {buyLabel}
              <ArrowRight size={16} strokeWidth={1.6} className="-mr-0.5" />
            </Link>
          </div>
        )}

        {/* Trust chips. Three short labels under the buttons that
            tell the visitor what they actually get on the other side
            of the click — closes the "куда я ухожу" gap without
            collapsing into a microtext line. */}
        <ul className="flex flex-wrap gap-1.5 md:justify-end w-full md:w-auto">
          {(isResale ? c.chipsResale : c.chipsPrimary).map(({ icon, label }) => {
            const Icon = icon === 'user' ? UserRound : icon === 'map' ? MapPinned : FileText
            return ({ Icon, label })
          }).map(({ Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--color-search-bg)] text-[12px] text-[var(--color-text-muted)]"
            >
              <Icon size={13} strokeWidth={1.6} className="opacity-80" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function formatUpdated(iso: string, locale: string = 'ru-RU'): string | null {
  try {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return null }
}
