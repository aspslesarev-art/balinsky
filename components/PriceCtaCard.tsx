'use client'

import type { ReactNode } from 'react'
import { detectLang, pickCopy } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import { Send, FileText, MapPinned, UserRound, Lock } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { formatPriceExact } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    buyChat: 'Контакты застройщика',
    buySeller: 'Контакты продавца',
    perSqm: '/ м²',
    priceUpdated: (d: string) => `Цена обновлена ${d}`,
    reservedTitle: 'Объект сейчас забронирован',
    reservedUntil: (d: string) => `Резерв действует до ${d}.`,
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
    buyChat: 'Developer contacts',
    buySeller: 'Seller contacts',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Price updated ${d}`,
    reservedTitle: 'Currently reserved',
    reservedUntil: (d: string) => `Hold expires on ${d}.`,
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
  id: {
    buyChat: 'Kontak pengembang',
    buySeller: 'Kontak penjual',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Harga diperbarui ${d}`,
    reservedTitle: 'Saat ini dipesan',
    reservedUntil: (d: string) => `Hold berlaku hingga ${d}.`,
    chipsResale: [
      { icon: 'user', label: 'Kontak langsung penjual' },
      { icon: 'file', label: 'Dokumen properti' },
    ],
    chipsPrimary: [
      { icon: 'file', label: 'Dokumen & due diligence' },
      { icon: 'map',  label: 'Master plan & denah' },
      { icon: 'user', label: 'Kontak langsung pengembang' },
    ],
    locale: 'id-ID',
  },
  fr: {
    buyChat: 'Contacts du promoteur',
    buySeller: 'Contacts du vendeur',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Prix mis à jour ${d}`,
    reservedTitle: 'Actuellement réservé',
    reservedUntil: (d: string) => `Le blocage expire le ${d}.`,
    chipsResale: [
      { icon: 'user', label: 'Contact direct du vendeur' },
      { icon: 'file', label: 'Documents du bien' },
    ],
    chipsPrimary: [
      { icon: 'file', label: 'Documents & due diligence' },
      { icon: 'map',  label: 'Plan directeur & plans' },
      { icon: 'user', label: 'Contact direct du promoteur' },
    ],
    locale: 'fr-FR',
  },
  de: {
    buyChat: 'Kontakt zum Bauträger',
    buySeller: 'Kontakt zum Verkäufer',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Preis aktualisiert ${d}`,
    reservedTitle: 'Derzeit reserviert',
    reservedUntil: (d: string) => `Reservierung gilt bis ${d}.`,
    chipsResale: [
      { icon: 'user', label: 'Direkter Verkäuferkontakt' },
      { icon: 'file', label: 'Objektunterlagen' },
    ],
    chipsPrimary: [
      { icon: 'file', label: 'Unterlagen & Due Diligence' },
      { icon: 'map',  label: 'Masterplan & Grundrisse' },
      { icon: 'user', label: 'Direkter Bauträgerkontakt' },
    ],
    locale: 'de-DE',
  },
  zh: {
    buyChat: '开发商联系方式',
    buySeller: '卖家联系方式',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `价格更新于 ${d}`,
    reservedTitle: '目前已预订',
    reservedUntil: (d: string) => `保留有效期至 ${d}。`,
    chipsResale: [
      { icon: 'user', label: '卖家直接联系' },
      { icon: 'file', label: '房产文件' },
    ],
    chipsPrimary: [
      { icon: 'file', label: '文件与尽职调查' },
      { icon: 'map',  label: '总体规划与户型图' },
      { icon: 'user', label: '开发商直接联系' },
    ],
    locale: 'zh-CN',
  },
  nl: {
    buyChat: 'Contact ontwikkelaar',
    buySeller: 'Contact verkoper',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Prijs bijgewerkt ${d}`,
    reservedTitle: 'Momenteel gereserveerd',
    reservedUntil: (d: string) => `Reservering geldt tot ${d}.`,
    chipsResale: [
      { icon: 'user', label: 'Direct contact met verkoper' },
      { icon: 'file', label: 'Objectdocumenten' },
    ],
    chipsPrimary: [
      { icon: 'file', label: 'Documenten & due diligence' },
      { icon: 'map',  label: 'Masterplan & plattegronden' },
      { icon: 'user', label: 'Direct contact met ontwikkelaar' },
    ],
    locale: 'nl-NL',
  },
  ban: {
    buyChat: 'Kontak pangwangun',
    buySeller: 'Kontak sang adol',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Aji kaanyarin ${d}`,
    reservedTitle: 'Sané mangkin kareservasi',
    reservedUntil: (d: string) => `Hold mamargi kantos ${d}.`,
    chipsResale: [
      { icon: 'user', label: 'Kontak langsung sang adol' },
      { icon: 'file', label: 'Dokumen properti' },
    ],
    chipsPrimary: [
      { icon: 'file', label: 'Dokumen & due diligence' },
      { icon: 'map',  label: 'Master plan & denah' },
      { icon: 'user', label: 'Kontak langsung pangwangun' },
    ],
    locale: 'id-ID',
  },
  pl: {
    buyChat: 'Kontakt do dewelopera',
    buySeller: 'Kontakt do sprzedającego',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Cena zaktualizowana ${d}`,
    reservedTitle: 'Obecnie zarezerwowane',
    reservedUntil: (d: string) => `Rezerwacja wygasa ${d}.`,
    chipsResale: [
      { icon: 'user', label: 'Bezpośredni kontakt ze sprzedającym' },
      { icon: 'file', label: 'Dokumenty nieruchomości' },
    ],
    chipsPrimary: [
      { icon: 'file', label: 'Dokumenty i due diligence' },
      { icon: 'map',  label: 'Master plan i rzuty' },
      { icon: 'user', label: 'Bezpośredni kontakt z deweloperem' },
    ],
    locale: 'pl-PL',
  },
  uk: {
    buyChat: 'Контакти забудовника',
    buySeller: 'Контакти продавця',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Ціну оновлено ${d}`,
    reservedTitle: 'Зараз заброньовано',
    reservedUntil: (d: string) => `Бронь діє до ${d}.`,
    chipsResale: [
      { icon: 'user', label: 'Прямий контакт продавця' },
      { icon: 'file', label: 'Документи обʼєкта' },
    ],
    chipsPrimary: [
      { icon: 'file', label: 'Документи та due diligence' },
      { icon: 'map',  label: 'Майстер-план і планування' },
      { icon: 'user', label: 'Прямий контакт забудовника' },
    ],
    locale: 'uk-UA',
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
  // Контекст объекта. Бронирование через сайт больше не предлагается —
  // эти поля остались для совместимости с вызывающими страницами, а
  // `reservedUntil` показывает статус «занято у застройщика», если он есть.
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
  const lang: Lang = detectLang(pathname)
  const c = pickCopy(COPY, lang)
  const main = formatPriceExact(priceUsd, currency, lang)
  const perSqm = pricePerSqmUsd != null && Number.isFinite(pricePerSqmUsd) && pricePerSqmUsd > 0
    ? formatPriceExact(pricePerSqmUsd, currency, lang)
    : null
  const updated = updatedAt ? formatUpdated(updatedAt, c.locale) : null

  const isResale = !!sellerUrl
  const buyLabel = isResale ? c.buySeller : c.buyChat
  // Контакты оператора объекта живут в блоке менеджеров ниже по странице;
  // сам Balinsky контактных действий не выполняет.
  void managerId
  void listingId
  void listingTitle
  void listingKind
  void listingSlug

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
            {presentationButton}
            {/* Balinsky не принимает заявки и не бронирует объекты: единственный
                CTA ведёт к прямым контактам оператора объекта — блок менеджеров
                застройщика на этой же странице, а для вторички сразу на
                страницу продавца. */}
            <a
              href={isResale ? sellerUrl! : '#kontakty-operatora'}
              {...(isResale ? { target: '_blank', rel: 'noopener nofollow' } : {})}
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 min-h-[54px] py-2 px-6 rounded-[10px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] md:text-[16px] font-semibold text-center leading-tight no-underline transition-colors shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_16px_-8px_rgba(31,90,52,0.6)]"
            >
              <Send size={18} strokeWidth={1.6} />
              {buyLabel}
            </a>
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
