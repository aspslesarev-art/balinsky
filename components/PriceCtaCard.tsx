'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Send, ArrowRight, FileText, MapPinned, UserRound, Lock } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { formatPrice, type Currency } from '@/lib/currency'
import { botLink } from '@/lib/bot-link'
import { ReserveButton } from './ReserveButton'

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
  const { currency, setCurrency } = useCurrency()
  const main = formatPrice(priceUsd, currency)
  const perSqm = pricePerSqmUsd != null && Number.isFinite(pricePerSqmUsd) && pricePerSqmUsd > 0
    ? formatPrice(pricePerSqmUsd, currency)
    : null
  const updated = updatedAt ? formatUpdated(updatedAt) : null

  const isResale = !!sellerUrl
  const buyHref = isResale ? sellerUrl! : botLink('manager', managerId ?? '')
  const buyLabel = isResale ? 'Купить — связаться с продавцом' : 'Купить — чат в Telegram'

  return (
    <div className="rounded-2xl bg-white border border-[var(--color-border)] px-5 py-5 md:px-6 md:py-[22px] grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 md:gap-6 md:items-center">
      {/* LEFT — price */}
      <div className="min-w-0">
        {/* Local IDR/USD/EUR pill — drives the global useCurrency state,
            so the catalog's currency stays in sync with whatever the
            visitor picks here. RUB / UAH still reachable via the header
            toggle; this pill stays compact with the three "Bali money"
            options that cover 95% of buyers. */}
        <div className="inline-flex items-center gap-0.5 mb-3 rounded-full bg-[var(--color-search-bg)] p-[3px]">
          {(['IDR', 'USD', 'EUR'] as Currency[]).map(c => {
            const active = currency === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  active
                    ? 'bg-white text-[#1A1F1C] shadow-[0_1px_2px_rgba(20,25,22,0.05)]'
                    : 'text-[var(--color-text-muted)] hover:text-[#1A1F1C]'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
        <div className="text-[30px] md:text-[32px] font-semibold tracking-[-0.02em] leading-none text-[#1A1F1C] tabular-nums">
          {main}
        </div>
        {perSqm && (
          <div className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
            {perSqm} / м²
          </div>
        )}
        {updated && (
          <div className="mt-2 text-[12px] text-[var(--color-text-muted)]">
            Цена обновлена {updated}
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
              <div className="font-semibold mb-0.5">Объект сейчас забронирован</div>
              <div>Hold действует до {formatUpdated(reservedUntil)}. Если бронь снимется — напишем менеджеру.</div>
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
              className="inline-flex items-center justify-center gap-2 h-[54px] px-6 rounded-[10px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] md:text-[16px] font-semibold whitespace-nowrap transition-colors no-underline shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_16px_-8px_rgba(31,90,52,0.6)]"
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
          {(isResale
            ? [
                { Icon: UserRound, label: 'Прямой контакт продавца' },
                { Icon: FileText, label: 'Документы по объекту' },
              ]
            : [
                { Icon: FileText, label: 'Документы и due diligence' },
                { Icon: MapPinned, label: 'Мастер-план и планировки' },
                { Icon: UserRound, label: 'Прямой контакт застройщика' },
              ]
          ).map(({ Icon, label }) => (
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

function formatUpdated(iso: string): string | null {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return null }
}
