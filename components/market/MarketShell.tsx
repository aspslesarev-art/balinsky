// Shared frame for the market-data pages (prices, rents, methodology):
// breadcrumbs, a dated header, the body, a numbered source list and the
// page's structured data. RU and EN only — see lib/market-index.ts.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { switchLangPath, type Lang } from '@/lib/i18n'
import { SITE_ORIGIN } from '@/lib/hreflang'
import { MARKET, RU_EN_MARKET_PAGES, marketPath, type MarketPageKey } from '@/lib/market-index'

export const H2 = 'text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight'
export const P = 'text-[16px] leading-[1.7] text-[#1f2937] max-w-[68ch]'
export const NOTE = 'mt-3 text-[13px] leading-[1.6] text-[var(--color-text-muted)] max-w-[68ch]'
export const A = 'text-[var(--color-primary-pressed)] underline underline-offset-2 hover:no-underline'

export type Source = { label: string; href: string }
export type Faq = { q: string; a: string }

export function marketMetadata(key: MarketPageKey, lang: Lang, title: string, description: string) {
  const path = marketPath(key, lang)
  const { ru, en } = RU_EN_MARKET_PAGES[key]
  return {
    title: `${title} | Balinsky`,
    description,
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_ORIGIN}${ru}`, en: `${SITE_ORIGIN}${en}`, 'x-default': `${SITE_ORIGIN}${ru}` },
    },
    openGraph: { title, description, type: 'article' as const, url: `${SITE_ORIGIN}${path}` },
    twitter: { card: 'summary_large_image' as const, title, description },
  }
}

export function MarketShell({ pageKey, lang, crumb, h1, lead, updated, children, sources, sourcesTitle, faq, faqTitle, dataset }: {
  pageKey: MarketPageKey
  lang: Lang
  crumb: string
  h1: string
  lead: ReactNode
  updated: string
  children: ReactNode
  sources: Source[]
  sourcesTitle: string
  faq?: Faq[]
  faqTitle?: string
  /** Schema.org Dataset name/description — omitted on the methodology page. */
  dataset?: { name: string; description: string }
}) {
  const path = marketPath(pageKey, lang)
  const url = `${SITE_ORIGIN}${path}`
  const ld: Record<string, unknown>[] = [{
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: h1,
    inLanguage: lang,
    dateModified: MARKET.generatedAt,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Balinsky', url: SITE_ORIGIN },
    publisher: { '@type': 'Organization', name: 'Balinsky', url: SITE_ORIGIN },
  }]
  if (dataset) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: dataset.name,
      description: dataset.description,
      url,
      dateModified: MARKET.generatedAt,
      temporalCoverage: MARKET.asOf,
      spatialCoverage: { '@type': 'Place', name: 'Bali, Indonesia' },
      creator: { '@type': 'Organization', name: 'Balinsky', url: SITE_ORIGIN },
      isAccessibleForFree: true,
      measurementTechnique: `${SITE_ORIGIN}${marketPath('method', lang)}`,
    })
  }
  if (faq?.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs
          items={[{ label: lang === 'ru' ? 'Главная' : 'Home', href: switchLangPath('/ru', lang) }, { label: crumb }]}
          currentUrl={path}
        />
        <article className="mt-6 mb-16 max-w-[960px]">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-[1.15]">{h1}</h1>
            <div className="text-[18px] leading-[1.6] text-[#374151] max-w-[68ch]">{lead}</div>
            <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">{updated}</p>
          </header>

          {children}

          {faq && faq.length > 0 && (
            <section className="mb-12">
              <h2 className={H2}>{faqTitle}</h2>
              <div className="space-y-6 max-w-[68ch]">
                {faq.map(f => (
                  <div key={f.q}>
                    <h3 className="text-[17px] font-semibold text-[#111827] mb-1.5">{f.q}</h3>
                    <p className="text-[15px] leading-[1.7] text-[#1f2937]">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="pt-8 border-t border-[var(--color-border)]">
            <h2 className="text-[20px] font-semibold tracking-tight text-[#111827] mb-3">{sourcesTitle}</h2>
            <ol className="list-decimal pl-5 space-y-1.5 text-[14px] text-[#1f2937] max-w-[68ch]">
              {sources.map(s => (
                <li key={s.href}>
                  {s.href.startsWith('/')
                    ? <Link href={s.href} className={A}>{s.label}</Link>
                    : <a href={s.href} target="_blank" rel="noopener noreferrer" className={A}>{s.label}</a>}
                </li>
              ))}
            </ol>
          </section>
        </article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </PageContainer>
    </>
  )
}
