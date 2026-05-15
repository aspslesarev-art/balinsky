// Shared knowledge-detail renderer.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageViewTracker } from '@/components/PageViewTracker'
import { loadAllKnowledge, loadKnowledgeBySlug } from '@/lib/knowledge'
import type { Lang } from '@/lib/i18n'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const COPY = {
  ru: { home: 'Главная', knowledgeCrumb: 'Знания', source: 'Источник', moreArticles: 'Ещё статьи' },
  en: { home: 'Home', knowledgeCrumb: 'Knowledge', source: 'Source', moreArticles: 'More articles' },
} as const

export async function generateKnowledgeDetailMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const k = await loadKnowledgeBySlug(slug, lang)
  if (!k) return { robots: { index: false, follow: false } }
  const ruPath = `/ru/znaniya/${k.slug}`
  const enPath = `/en/knowledge/${k.slug}`
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: `${k.title} | Balinsky`,
    description: k.body.slice(0, 160).replace(/\s+/g, ' ').trim(),
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: {
      title: k.title,
      images: k.photo ? [k.photo] : undefined,
      type: 'article',
    },
  }
}

export async function KnowledgeDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const c = COPY[lang]
  const k = await loadKnowledgeBySlug(slug, lang)
  if (!k) notFound()
  const home = lang === 'en' ? '/en' : '/ru'
  const knowledgeRoot = lang === 'en' ? '/en/knowledge' : '/ru/znaniya'

  const all = await loadAllKnowledge(lang)
  const related = all.filter(x => x.id !== k.id).slice(0, 4)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: k.title,
    image: k.photo ? [k.photo] : undefined,
    datePublished: k.createdTime ?? undefined,
    publisher: { '@type': 'Organization', name: 'Balinsky' },
    mainEntityOfPage: `${SITE_URL}${lang === 'en' ? '/en/knowledge/' : '/ru/znaniya/'}${k.slug}`,
  }

  return (
    <>
      <Header />
      <PageViewTracker kind="knowledge" slug={slug} title={k.title} airtableId={k.id} lang={lang} />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.knowledgeCrumb, href: knowledgeRoot },
          { label: k.title },
        ]} />

        <article className="mt-4">
          <h1 className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight text-[#111827] mb-6">
            {k.title}
          </h1>

          {k.photo && (
            <div className="relative w-full mb-8 rounded-2xl overflow-hidden bg-[var(--color-search-bg)] aspect-[16/9]">
              <Image src={k.photo} alt={k.title} fill sizes="(max-width: 768px) 100vw, 800px" priority className="object-cover" />
            </div>
          )}

          <div className="text-[16px] leading-[1.7] text-[var(--color-text)] whitespace-pre-wrap">
            {k.body}
          </div>

          {k.externalUrl && (
            <div className="mt-6">
              <a href={k.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[14px] hover:border-[var(--color-primary)] no-underline">
                <ExternalLink size={14} /> {c.source}
              </a>
            </div>
          )}
        </article>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">{c.moreArticles}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(r => (
                <li key={r.id}>
                  <Link href={`${knowledgeRoot}/${r.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {r.photo ? (
                        <Image src={r.photo} alt={r.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                      )}
                    </div>
                    <div className="p-3 text-[14px] font-medium leading-snug line-clamp-3">{r.title}</div>
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
