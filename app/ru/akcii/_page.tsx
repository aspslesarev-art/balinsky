// Shared promo-list shell for /ru/akcii and /en/promo.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllPromo } from '@/lib/promo'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    title: 'Акции и спецпредложения от застройщиков Бали | Balinsky',
    description: 'Скидки, рассрочки и спецпредложения от застройщиков на виллы и апартаменты Бали.',
    h1: 'Акции',
    sub: 'Скидки, рассрочки и спецпредложения от застройщиков Бали',
    active: 'Действующие',
    expiredHeading: 'Завершённые',
    expired: 'завершена',
    top: 'топ',
    until: (d: string) => `До ${d}`,
    empty: 'Пока нет активных акций.',
    locale: 'ru-RU',
  },
  en: {
    title: 'Promotions and special offers from Bali developers | Balinsky',
    description: 'Discounts, instalments and special offers from developers on Bali villas and apartments.',
    h1: 'Promotions',
    sub: 'Discounts, instalments and special offers from Bali developers',
    active: 'Active',
    expiredHeading: 'Expired',
    expired: 'expired',
    top: 'top',
    until: (d: string) => `Until ${d}`,
    empty: 'No active promotions yet.',
    locale: 'en-GB',
  },
  id: {
    title: 'Promosi dan penawaran khusus dari pengembang Bali | Balinsky',
    description: 'Diskon, cicilan, dan penawaran khusus dari pengembang untuk vila dan apartemen di Bali.',
    h1: 'Promosi',
    sub: 'Diskon, cicilan, dan penawaran khusus dari pengembang Bali',
    active: 'Aktif',
    expiredHeading: 'Berakhir',
    expired: 'berakhir',
    top: 'top',
    until: (d: string) => `Sampai ${d}`,
    empty: 'Belum ada promosi aktif.',
    locale: 'id-ID',
  },
  fr: {
    title: 'Promotions et offres spéciales des promoteurs de Bali | Balinsky',
    description: 'Réductions, paiements échelonnés et offres spéciales des promoteurs sur les villas et appartements de Bali.',
    h1: 'Promotions',
    sub: 'Réductions, paiements échelonnés et offres spéciales des promoteurs de Bali',
    active: 'Actives',
    expiredHeading: 'Terminées',
    expired: 'terminée',
    top: 'top',
    until: (d: string) => `Jusqu’au ${d}`,
    empty: 'Aucune promotion active pour le moment.',
    locale: 'fr-FR',
  },
} as const

function fmtDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}
function isExpired(iso: string | null): boolean {
  if (!iso) return false
  try { return new Date(iso).getTime() < Date.now() } catch { return false }
}

export function generatePromoListMetadata(lang: Lang): Metadata {
  const c = pickCopy(COPY, lang)
  const ruPath = '/ru/akcii'
  const enPath = '/en/promo'
  const path = switchLangPath(ruPath, lang)
  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: path,
      languages: { ru: `https://balinsky.info${ruPath}`, en: `https://balinsky.info${enPath}` , 'x-default': `https://balinsky.info${ruPath}`},
    },
  }
}

// Sort active promos: pinned first, then those with the latest expiry
// (still-fresh ones before about-to-end), null-expiry treated as
// far-future. Expired list goes most-recently-expired first.
function expiryMs(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY
}

type PromoItem = Awaited<ReturnType<typeof loadAllPromo>>[number]
type PromoCopy = {
  expired: string
  top: string
  until: (d: string) => string
  locale: string
}

function PromoCard({
  p, expired, c, detailRoot,
}: {
  p: PromoItem; expired: boolean;
  c: PromoCopy; detailRoot: string
}) {
  return (
    <Link href={`${detailRoot}/${p.slug}`} className={`block rounded-2xl overflow-hidden border bg-white no-underline text-[#111827] transition-colors ${expired ? 'border-[var(--color-border)]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
      {p.photo ? (
        <div className={`relative w-full h-[180px] ${expired ? 'grayscale' : ''}`}>
          <Image src={p.photo} alt={p.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        </div>
      ) : (
        <div className="w-full h-[180px] bg-[var(--color-search-bg)] flex items-center justify-center text-3xl">🎁</div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          {p.developers[0]?.name && (
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium">
              {p.developers[0].name}
            </span>
          )}
          {expired && (
            <span className="text-[10px] uppercase tracking-wide bg-[#E5E7EB] text-[#374151] px-1.5 py-0.5 rounded">{c.expired}</span>
          )}
          {!expired && p.pinned && (
            <span className="text-[10px] uppercase tracking-wide bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] px-1.5 py-0.5 rounded">{c.top}</span>
          )}
        </div>
        <div className="text-[16px] font-semibold leading-snug mb-2 line-clamp-3">{p.title}</div>
        {fmtDate(p.expiresAt, c.locale) && (
          <div className="text-[12px] text-[var(--color-text-muted)]">{c.until(fmtDate(p.expiresAt, c.locale)!)}</div>
        )}
      </div>
    </Link>
  )
}

export async function PromoList({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const items = await loadAllPromo(lang)
  const detailRoot = switchLangPath('/ru/akcii', lang)

  const active = items
    .filter(p => !isExpired(p.expiresAt))
    .sort((a, b) => {
      // Pinned first, then soonest deadline (closest expiry first
      // gives urgency; null expiry sorts to the end).
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return expiryMs(a.expiresAt) - expiryMs(b.expiresAt)
    })
  const expired = items
    .filter(p => isExpired(p.expiresAt))
    .sort((a, b) => expiryMs(b.expiresAt) - expiryMs(a.expiresAt))

  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">{c.h1}</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">{c.sub}</div>

        {active.length > 0 && (
          <>
            <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] mb-4">{c.active}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {active.map(p => (
                <li key={p.id}>
                  <PromoCard p={p} expired={false} c={c} detailRoot={detailRoot} />
                </li>
              ))}
            </ul>
          </>
        )}

        {expired.length > 0 && (
          <>
            <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] mb-4">{c.expiredHeading}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {expired.slice(0, 24).map(p => (
                <li key={p.id} className="opacity-60">
                  <PromoCard p={p} expired={true} c={c} detailRoot={detailRoot} />
                </li>
              ))}
            </ul>
          </>
        )}

        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
            {c.empty}
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
