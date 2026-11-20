'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { detectLang, pickCopy } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import { Send, Lock } from 'lucide-react'
import { ApproxPrice } from './InlinePrice'
import { useCurrency } from './CurrencyContext'
import { formatPriceExact } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    buyChat: 'Связаться с застройщиком',
    buyChatBar: 'Написать застройщику',
    buySeller: 'Связаться с продавцом',
    perSqm: '/ м²',
    priceUpdated: (d: string) => `Цена обновлена ${d}`,
    reservedTitle: 'Объект сейчас забронирован',
    reservedUntil: (d: string) => `Резерв действует до ${d}.`,
    saveCompare: 'Сохранить и сравнить',
    locale: 'ru-RU',
  },
  en: {
    buyChat: 'Developer contacts',
    buyChatBar: 'Message the developer',
    buySeller: 'Seller contacts',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Price updated ${d}`,
    reservedTitle: 'Currently reserved',
    reservedUntil: (d: string) => `Hold expires on ${d}.`,
    saveCompare: 'Save & compare',
    locale: 'en-GB',
  },
  id: {
    buyChat: 'Kontak pengembang',
    buySeller: 'Kontak penjual',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Harga diperbarui ${d}`,
    reservedTitle: 'Saat ini dipesan',
    reservedUntil: (d: string) => `Hold berlaku hingga ${d}.`,
    saveCompare: 'Simpan & bandingkan',
    locale: 'id-ID',
  },
  fr: {
    buyChat: 'Contacts du promoteur',
    buySeller: 'Contacts du vendeur',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Prix mis à jour ${d}`,
    reservedTitle: 'Actuellement réservé',
    reservedUntil: (d: string) => `Le blocage expire le ${d}.`,
    saveCompare: 'Sauvegarder et comparer',
    locale: 'fr-FR',
  },
  de: {
    buyChat: 'Kontakt zum Bauträger',
    buySeller: 'Kontakt zum Verkäufer',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Preis aktualisiert ${d}`,
    reservedTitle: 'Derzeit reserviert',
    reservedUntil: (d: string) => `Reservierung gilt bis ${d}.`,
    saveCompare: 'Speichern & vergleichen',
    locale: 'de-DE',
  },
  zh: {
    buyChat: '开发商联系方式',
    buySeller: '卖家联系方式',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `价格更新于 ${d}`,
    reservedTitle: '目前已预订',
    reservedUntil: (d: string) => `保留有效期至 ${d}。`,
    saveCompare: '保存并比较',
    locale: 'zh-CN',
  },
  nl: {
    buyChat: 'Contact ontwikkelaar',
    buySeller: 'Contact verkoper',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Prijs bijgewerkt ${d}`,
    reservedTitle: 'Momenteel gereserveerd',
    reservedUntil: (d: string) => `Reservering geldt tot ${d}.`,
    saveCompare: 'Opslaan & vergelijken',
    locale: 'nl-NL',
  },
  ban: {
    buyChat: 'Kontak pangwangun',
    buySeller: 'Kontak sang adol',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Aji kaanyarin ${d}`,
    reservedTitle: 'Sané mangkin kareservasi',
    reservedUntil: (d: string) => `Hold mamargi kantos ${d}.`,
    saveCompare: 'Simpen & bandingang',
    locale: 'id-ID',
  },
  pl: {
    buyChat: 'Kontakt do dewelopera',
    buySeller: 'Kontakt do sprzedającego',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Cena zaktualizowana ${d}`,
    reservedTitle: 'Obecnie zarezerwowane',
    reservedUntil: (d: string) => `Rezerwacja wygasa ${d}.`,
    saveCompare: 'Zapisz i porównaj',
    locale: 'pl-PL',
  },
  uk: {
    buyChat: 'Контакти забудовника',
    buySeller: 'Контакти продавця',
    perSqm: '/ m²',
    priceUpdated: (d: string) => `Ціну оновлено ${d}`,
    reservedTitle: 'Зараз заброньовано',
    reservedUntil: (d: string) => `Бронь діє до ${d}.`,
    saveCompare: 'Зберегти та порівняти',
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
  pricePrefix = null,
  note = null,
  sidebar = false,
  sidebarExtra = null,
  dealRows = null,
  priceCompDiffPct = null,
  journal = false,
  bar = false,
  links = null,
  compact = null,
  hideMain = false,
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
  pricePrefix?: string | null
  note?: string | null
  sidebar?: boolean
  sidebarExtra?: ReactNode
  dealRows?: { label: string; valueUsd?: number; valueText?: string; approx?: boolean }[] | null
  priceCompDiffPct?: number | null
  /** Стиль «Журнал» (страница виллы, макет владельца 19.11.2026): без рамки,
   *  крупная цена, одна зелёная кнопка, под ней ссылки `links`. */
  journal?: boolean
  /** Журнал, вариант A: одна полоса во всю ширину под фото (цена · за м² · рассрочка · кнопка). */
  bar?: boolean
  links?: ReactNode
  /** Только цена и «обновлена …» — для формы записи (LeadHeroCard) и нижней кнопки на телефоне. */
  compact?: 'lg' | 'sm' | 'updated' | null
  /** Полоса без цены и кнопки — их показывает форма записи на созвон (владелец 20.11.2026). */
  hideMain?: boolean
}) {
  const { currency } = useCurrency()
  const pathname = usePathname() ?? ''
  const lang: Lang = detectLang(pathname)
  const c = pickCopy(COPY, lang)
  const main = formatPriceExact(priceUsd, currency, lang)
  const perSqm = pricePerSqmUsd != null && Number.isFinite(pricePerSqmUsd) && pricePerSqmUsd > 0
    ? formatPriceExact(pricePerSqmUsd, currency, lang)
    : null
  // «Сегодня», «вчера», «5 дней назад» вместо даты (владелец 19.11.2026). Считаем после
  // загрузки у посетителя: у сервера другой часовой пояс — иначе ошибка гидрации.
  const [relUpdated, setRelUpdated] = useState<string | null>(null)
  useEffect(() => { setRelUpdated(updatedAt ? relativeDay(updatedAt, c.locale) : null) }, [updatedAt, c.locale])
  const updated = relUpdated ?? (updatedAt ? formatUpdated(updatedAt, c.locale) : null)

  const isResale = !!sellerUrl
  const buyLabel = isResale ? c.buySeller : c.buyChat
  // Контакты оператора объекта живут в блоке менеджеров ниже по странице;
  // сам Balinsky контактных действий не выполняет.
  void managerId
  void listingId
  void listingTitle
  void listingKind
  void listingSlug

  // Вариант A (владелец 19.11.2026): полоса под главным фото — цена и «обновлена»,
  // за м² и рассрочка столбиками «значение / подпись», справа ссылки и кнопка.
  if (compact) {
    if (compact === 'updated') return updated ? <span className="text-[12px] text-[#6B7570]">{c.priceUpdated(updated).replace(/^./, ch => (lang === 'de' ? ch : ch.toLowerCase()))}</span> : null
    return compact === 'sm' ? (
      <span className="text-[18px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#0F1A15] tabular-nums">{pricePrefix ? `${pricePrefix} ` : ''}{main}</span>
    ) : (
      <span className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-[#0F1A15] tabular-nums">{pricePrefix ? `${pricePrefix} ` : ''}{main}</span>
    )
  }

  if (journal && bar) {
    const barLabel = isResale ? c.buySeller : ((c as { buyChatBar?: string }).buyChatBar ?? c.buyChat)
    const cols: { v: string; l: string }[] = [
      ...(perSqm ? [{ v: perSqm, l: c.perSqm.replace(/^\/\s*/, lang === 'ru' || lang === 'uk' ? 'за ' : 'per ') }] : []),
      ...(dealRows ?? []).map(row => ({ v: row.valueUsd != null ? `${row.approx ? '≈ ' : ''}${formatPriceExact(row.valueUsd, currency, lang)}` : (row.valueText ?? ''), l: row.label.toLowerCase() })),
    ]
    return (
      <div className="flex flex-wrap items-center gap-x-12 gap-y-4 border-b border-[#ECEFED] py-5">
        {!hideMain && <div className="flex flex-col gap-0.5">
          <div className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F1A15] tabular-nums">{pricePrefix ? `${pricePrefix} ` : ''}{main}</div>
          {updated && <div className="text-[13px] text-[#6B7570]">{c.priceUpdated(updated).replace(/^./, ch => (lang === 'de' ? ch : ch.toLowerCase()))}</div>}
        </div>}
        {cols.map(col => (
          <div key={col.l} className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-[#0F1A15] tabular-nums">{col.v}</span>
            <span className="text-[13px] text-[#6B7570]">{col.l}</span>
          </div>
        ))}
        {note && <div className="text-[14px] text-[#6B7570]">{note}</div>}
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-3">
          {links}
          {hideMain ? null : reservedUntil ? (
            <span className="flex items-center gap-2 text-[14px] text-[#92400E]"><Lock size={16} strokeWidth={1.6} /><span className="font-semibold">{c.reservedTitle}</span></span>
          ) : (
            <a href={isResale ? sellerUrl! : '#kontakty-operatora'} {...(isResale ? { target: '_blank', rel: 'noopener nofollow' } : {})}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--color-primary)] px-6 text-[16px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
              {barLabel}
            </a>
          )}
        </div>
      </div>
    )
  }

  if (journal) {
    // Цена за м² и дата обновления — каждая своей строкой (владелец 19.11.2026).
    const meta = perSqm ? `${perSqm} ${c.perSqm}` : null
    const updatedLine = updated ? c.priceUpdated(updated) : null
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[36px] md:text-[44px] font-semibold leading-none tracking-[-0.03em] text-[#0F1A15] tabular-nums">
            {pricePrefix ? `${pricePrefix} ` : ''}{main}
          </div>
          <ApproxPrice usd={priceUsd} lang={lang} className="block mt-1 text-[14px] text-[#6B7570]" />
          {meta && <div className="text-[14px] text-[#6B7570]">{meta}</div>}
          {updatedLine && <div className="text-[14px] text-[#6B7570]">{updatedLine}</div>}
          {note && <div className="text-[14px] text-[#6B7570]">{note}</div>}
          {dealRows && dealRows.map((row, i) => (
            <div key={i} className="text-[14px] text-[#6B7570]">
              {row.label}: <span className="text-[#0F1A15]">{row.valueUsd != null ? `${row.approx ? '≈ ' : ''}${formatPriceExact(row.valueUsd, currency, lang)}` : row.valueText}</span>
            </div>
          ))}
        </div>
        {reservedUntil ? (
          <div className="flex items-start gap-2 text-[14px] leading-snug text-[#92400E]">
            <Lock size={16} strokeWidth={1.6} className="shrink-0 mt-0.5" />
            <span><span className="font-semibold">{c.reservedTitle}.</span> {c.reservedUntil(formatUpdated(reservedUntil, c.locale) ?? '')}</span>
          </div>
        ) : (
          <a
            href={isResale ? sellerUrl! : '#kontakty-operatora'}
            {...(isResale ? { target: '_blank', rel: 'noopener nofollow' } : {})}
            className="inline-flex h-12 w-full md:w-auto md:self-start items-center justify-center rounded-xl bg-[var(--color-primary)] px-7 text-[16px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {isResale ? c.buySeller : ((c as { buyChatBar?: string }).buyChatBar ?? c.buyChat)}
          </a>
        )}
        {presentationButton}
        {links}
      </div>
    )
  }

  return (
    <div className={`rounded-2xl bg-white border border-[var(--color-border)] px-5 py-5 md:px-6 md:py-[22px] grid gap-5 md:gap-6 ${sidebar ? 'grid-cols-1 shadow-[0_1px_2px_rgb(0_0_0/.04),0_4px_12px_rgb(0_0_0/.06)]' : 'grid-cols-1 xl:grid-cols-[1fr_auto] xl:items-center'}`}>
      {/* LEFT — price */}
      <div className="min-w-0">
        <div className="text-[30px] md:text-[32px] font-semibold tracking-[-0.02em] leading-none text-[#1A1F1C] tabular-nums">
          {pricePrefix ? `${pricePrefix} ` : ''}{main}
        </div>
        <ApproxPrice usd={priceUsd} lang={lang} className="block mt-2 text-[15px] text-[var(--color-text-muted)]" />
        {perSqm && (
          <div className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
            {perSqm} {c.perSqm}
          </div>
        )}
        {note && (
          <div className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">{note}</div>
        )}
        {updated && (
          <div className="mt-2 text-[12px] text-[var(--color-text-muted)]">
            {c.priceUpdated(updated)}
          </div>
        )}
      </div>

      {/* Шкала «цена для района» — сразу под датой обновления, рассрочка ниже (владелец 18.11.2026).
          Границы зон (33,3% и 66,6%) — ровно там, где меняется подпись: ±15% от середины рынка.
          Раньше точка уходила в зелёную зону уже на −11%, а подпись ещё была «обычная». */}
      {sidebar && priceCompDiffPct != null && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[14px] font-semibold">{pickCopy(
            Math.abs(priceCompDiffPct) < 15
              ? { ru: 'Цена обычная для района', en: 'Normal price for the area', id: 'Harga normal untuk area ini', fr: 'Prix normal pour le quartier', de: 'Normaler Preis für die Gegend', zh: '区域正常价格', nl: 'Normale prijs voor dit gebied', ban: 'Aji biasa ring daerah niki', pl: 'Normalna cena w okolicy', uk: 'Звичайна ціна для району' }
              : priceCompDiffPct < 0
                ? { ru: 'Цена ниже рынка', en: 'Below market price', id: 'Harga di bawah pasar', fr: 'Prix inférieur au marché', de: 'Unter Marktpreis', zh: '低于市场价格', nl: 'Onder marktprijs', ban: 'Aji ring bawah pasar', pl: 'Cena poniżej rynku', uk: 'Ціна нижча ринку' }
                : { ru: 'Цена выше рынка', en: 'Above market price', id: 'Harga di atas pasar', fr: 'Prix supérieur au marché', de: 'Über Marktpreis', zh: '高于市场价格', nl: 'Boven marktprijs', ban: 'Aji ring duur pasar', pl: 'Cena powyżej rynku', uk: 'Ціна вища ринку' },
            lang)}</span>
          <div className="relative h-[10px] rounded-[5px]" style={{ background: 'linear-gradient(90deg, #CFE8D9 0% 33.3%, #F6E2BF 33.3% 66.6%, #F4D3CE 66.6% 100%)' }} aria-hidden="true">
            <div className="absolute top-[-5px] w-5 h-5 rounded-full bg-[#D93025] border-[3px] border-white" style={{ left: `${Math.max(5, Math.min(95, 50 + priceCompDiffPct * (100 / 6 / 15)))}%`, marginLeft: '-10px', boxShadow: '0 0 0 2px #D93025', boxSizing: 'border-box' }} />
          </div>
        </div>
      )}
      {sidebar && dealRows && dealRows.length > 0 && (
        <div className="flex flex-col">
          {dealRows.map((row, i) => (
            <div key={i} className="flex justify-between gap-2 py-2 border-b border-dotted border-[#CFD8D3] text-[14px]">
              <span className="text-[var(--color-text-muted)]">{row.label}</span>
              <span className="font-medium text-right">{row.valueUsd != null ? `${row.approx ? '≈ ' : ''}${formatPriceExact(row.valueUsd, currency, lang)}` : row.valueText}</span>
            </div>
          ))}
        </div>
      )}
      {sidebar && sidebarExtra}

      {/* RIGHT — CTAs + trust chips. Order on mobile uses CSS so the
          primary button stays at the top per spec. */}
      <div className={`flex flex-col gap-3 ${sidebar ? '' : 'xl:items-end'}`}>
        {reservedUntil ? (
          // The unit is already on a 14-day hold. Hide the buy / reserve
          // CTAs so two visitors don't think they both have it. They can
          // still reach the operator via the bot if they want to be
          // notified when the hold lifts.
          <div className="w-full md:w-auto md:max-w-[420px] rounded-[10px] border border-[var(--color-border)] bg-[#FEF3C7] text-[#92400E] px-4 py-3 flex items-start gap-2">
            <Lock size={16} strokeWidth={1.6} className="shrink-0 mt-0.5" />
            <div className="text-[13px] leading-snug">
              <div className="font-semibold mb-0.5">{c.reservedTitle}</div>
              <div>{c.reservedUntil(formatUpdated(reservedUntil, c.locale) ?? '')}</div>
            </div>
          </div>
        ) : (
          <div className={`flex gap-2 w-full ${sidebar ? 'flex-col' : 'flex-col-reverse md:flex-row md:w-auto'}`}>
            {presentationButton}
            {/* Balinsky не принимает заявки и не бронирует объекты: единственный
                CTA ведёт к прямым контактам оператора объекта — блок менеджеров
                застройщика на этой же странице, а для вторички сразу на
                страницу продавца. */}
            <a
              href={isResale ? sellerUrl! : '#kontakty-operatora'}
              {...(isResale ? { target: '_blank', rel: 'noopener nofollow' } : {})}
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 min-h-[54px] py-2 px-6 rounded-[10px] bg-[var(--color-primary-hover)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] md:text-[16px] font-semibold text-center leading-tight no-underline transition-colors shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_16px_-8px_rgba(31,90,52,0.6)]"
            >
              <Send size={18} strokeWidth={1.6} />
              {buyLabel}
            </a>
            {/* «Сохранить и сравнить» убрана: ничего не делала, лишняя кнопка (владелец 18.11.2026). */}
          </div>
        )}

      </div>
    </div>
  )
}

/** «сегодня», «вчера», «5 дней назад» на языке страницы — до месяца; раньше — null (покажем дату). */
function relativeDay(iso: string, locale: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(new Date()) - day(d)) / 86_400_000)
  if (diff < 0 || diff > 30) return null
  try { return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-diff, 'day') } catch { return null }
}

function formatUpdated(iso: string, locale: string = 'ru-RU'): string | null {
  try {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return null }
}
