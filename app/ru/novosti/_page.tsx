// Shared news-list shell for /ru/novosti and /en/news.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadAllNews } from '@/lib/news'
import { tField, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    title: 'Новости застройщиков Бали | Balinsky',
    description: 'Свежие новости от застройщиков и о рынке недвижимости Бали.',
    h1: 'Новости',
    sub: (n: number) => `${n} ${n % 10 === 1 && n !== 11 ? 'новость' : n % 10 >= 2 && n % 10 <= 4 && (n < 10 || n > 20) ? 'новости' : 'новостей'} от застройщиков Бали`,
    empty: 'Пока нет новостей.',
    locale: 'ru-RU',
  },
  en: {
    title: 'Bali developer news | Balinsky',
    description: 'Latest news from Bali developers and the real-estate market.',
    h1: 'News',
    sub: (n: number) => `${n} ${n === 1 ? 'story' : 'stories'} from Bali developers`,
    empty: 'No news yet.',
    locale: 'en-GB',
  },
} as const

function fmtDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

export function generateNewsListMetadata(lang: Lang): Metadata {
  const c = COPY[lang]
  const ruPath = '/ru/novosti'
  const enPath = '/en/news'
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: path,
      languages: { ru: `https://balinsky.info${ruPath}`, en: `https://balinsky.info${enPath}` , 'x-default': `https://balinsky.info${ruPath}`},
    },
  }
}

export async function NewsList({ lang }: { lang: Lang }) {
  const items = await loadAllNews(lang)
  const c = COPY[lang]
  const detailRoot = lang === 'en' ? '/en/news' : '/ru/novosti'
  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">{c.h1}</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">{c.sub(items.length)}</div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(n => {
            const title = tField((n as unknown as { data?: Record<string, unknown> }).data ?? {}, 'title', lang) ?? n.title
            return (
              <li key={n.id}>
                <Link href={`${detailRoot}/${n.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                  {n.photo ? (
                    <div className="relative w-full h-[180px]">
                      <Image src={n.photo} alt={title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-[180px] bg-[var(--color-search-bg)] flex items-center justify-center text-3xl">📰</div>
                  )}
                  <div className="p-4">
                    {n.developers[0]?.name && (
                      <div className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1.5">
                        {n.developers[0].name}
                      </div>
                    )}
                    <div className="text-[16px] font-semibold leading-snug mb-2 line-clamp-3">{title}</div>
                    {fmtDate(n.date, c.locale) && (
                      <div className="text-[12px] text-[var(--color-text-muted)]">{fmtDate(n.date, c.locale)}</div>
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
