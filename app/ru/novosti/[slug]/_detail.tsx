// Shared news-detail renderer.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, ExternalLink, Building2, HardHat } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageViewTracker } from '@/components/PageViewTracker'
import { loadAllNews, loadNewsBySlug } from '@/lib/news'
import type { Lang } from '@/lib/i18n'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const COPY = {
  ru: {
    home: 'Главная', newsCrumb: 'Новости',
    watchVideo: 'Смотреть видео', source: 'Источник',
    moreFrom: (n: string) => `Ещё от ${n}`,
    locale: 'ru-RU',
  },
  en: {
    home: 'Home', newsCrumb: 'News',
    watchVideo: 'Watch video', source: 'Source',
    moreFrom: (n: string) => `More from ${n}`,
    locale: 'en-GB',
  },
} as const

function fmtDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

export async function generateNewsDetailMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const n = await loadNewsBySlug(slug, lang)
  if (!n) return { robots: { index: false, follow: false } }
  const ruPath = `/ru/novosti/${n.slug}`
  const enPath = `/en/news/${n.slug}`
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: `${n.title} | Balinsky`,
    description: n.seoDescription ?? (n.body?.slice(0, 160) ?? n.title),
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: {
      title: n.title,
      description: n.seoDescription ?? undefined,
      images: n.photo ? [n.photo] : undefined,
      type: 'article',
      publishedTime: n.date ?? undefined,
    },
  }
}

export async function NewsDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const c = COPY[lang]
  const n = await loadNewsBySlug(slug, lang)
  if (!n) notFound()
  const home = lang === 'en' ? '/en' : '/ru'
  const newsRoot = lang === 'en' ? '/en/news' : '/ru/novosti'
  const developersRoot = lang === 'en' ? '/en/developers' : '/ru/zastrojshhiki'

  const date = fmtDate(n.date, c.locale)
  const allNews = await loadAllNews(lang)
  const related = n.developers[0]?.slug
    ? allNews.filter(x => x.id !== n.id && x.developers.some(d => d.slug === n.developers[0].slug)).slice(0, 4)
    : []

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: n.title,
    image: n.photo ? [n.photo] : undefined,
    datePublished: n.date ?? undefined,
    description: n.seoDescription ?? undefined,
    author: n.developers[0]?.name ? { '@type': 'Organization', name: n.developers[0].name } : undefined,
    publisher: { '@type': 'Organization', name: 'Balinsky' },
    mainEntityOfPage: `${SITE_URL}${lang === 'en' ? '/en/news/' : '/ru/novosti/'}${n.slug}`,
  }

  return (
    <>
      <Header />
      <PageViewTracker kind="news" slug={slug} title={n.title} airtableId={n.id} lang={lang} />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.newsCrumb, href: newsRoot },
          { label: n.title },
        ]} />

        <article className="mt-4">
          <h1 className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight text-[#111827] mb-4">
            {n.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--color-text-muted)] mb-6">
            {date && (
              <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {date}</span>
            )}
            {n.developers[0] && (
              n.developers[0].slug ? (
                <Link href={`${developersRoot}/${n.developers[0].slug}`} className="inline-flex items-center gap-1.5 text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline">
                  <HardHat size={14} /> {n.developers[0].name}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5"><HardHat size={14} /> {n.developers[0].name}</span>
              )
            )}
            {n.complexNames[0] && (
              <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {n.complexNames[0]}</span>
            )}
          </div>

          {n.photo && (
            <div className="relative w-full mb-8 rounded-2xl overflow-hidden bg-[var(--color-search-bg)] aspect-[16/9]">
              <Image src={n.photo} alt={n.title} fill sizes="(max-width: 768px) 100vw, 800px" priority className="object-cover" />
            </div>
          )}

          {n.body && (
            <div className="text-[16px] leading-[1.7] text-[var(--color-text)] whitespace-pre-wrap">
              {n.body}
            </div>
          )}

          {n.videoUrl && (
            <div className="mt-6">
              <a href={n.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-[14px] hover:border-[var(--color-primary)] no-underline">
                <ExternalLink size={14} /> {c.watchVideo}
              </a>
            </div>
          )}

          {n.externalUrl && (
            <div className="mt-3">
              <a href={n.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-[14px] hover:border-[var(--color-primary)] no-underline">
                <ExternalLink size={14} /> {c.source}
              </a>
            </div>
          )}
        </article>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">
              {c.moreFrom(n.developers[0].name)}
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(r => (
                <li key={r.id}>
                  <Link href={`${newsRoot}/${r.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    {r.photo ? (
                      <div className="relative w-full h-[120px]">
                        <Image src={r.photo} alt={r.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-[120px] bg-[var(--color-search-bg)] flex items-center justify-center text-2xl">📰</div>
                    )}
                    <div className="p-3 text-[14px] font-medium leading-snug line-clamp-3">
                      {r.title}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
