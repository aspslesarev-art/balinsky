// Shared promo-list shell for /ru/akcii and /en/promo.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllPromo } from '@/lib/promo'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    title: 'Акции и спецпредложения от застройщиков Бали | Balinsky',
    description: 'Скидки, рассрочки и спецпредложения от застройщиков на виллы и апартаменты Бали.',
    h1: 'Акции',
    sub: 'Скидки, рассрочки и спецпредложения от застройщиков Бали',
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
    expired: 'expired',
    top: 'top',
    until: (d: string) => `Until ${d}`,
    empty: 'No active promotions yet.',
    locale: 'en-GB',
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
  const c = COPY[lang]
  const ruPath = '/ru/akcii'
  const enPath = '/en/promo'
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: path,
      languages: { ru: `https://balinsky.info${ruPath}`, en: `https://balinsky.info${enPath}` },
    },
  }
}

export async function PromoList({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const items = await loadAllPromo()
  const detailRoot = lang === 'en' ? '/en/promo' : '/ru/akcii'
  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">{c.h1}</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">{c.sub}</div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(p => {
            const expired = isExpired(p.expiresAt)
            return (
              <li key={p.id}>
                <Link href={`${detailRoot}/${p.slug}`} className={`block rounded-2xl overflow-hidden border bg-white no-underline text-[#111827] transition-colors ${expired ? 'border-[var(--color-border)] opacity-70' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                  {p.photo ? (
                    <img src={p.photo} alt={p.title} className="w-full h-[180px] object-cover" />
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
              </li>
            )
          })}
        </ul>
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
