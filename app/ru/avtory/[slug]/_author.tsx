// Author page: who a guest columnist is and every article of theirs.
// Only ru and en have one; the other locales' bylines link to /en/authors.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ArticleCover } from '@/components/ArticleCover'
import { loadAllKnowledge } from '@/lib/knowledge'
import { enKnowledgeSlug } from '@/lib/knowledge-en-slugs'
import { getAuthor, authorPath } from '@/lib/authors'
import { switchLangPath } from '@/lib/i18n'
import { SITE_ORIGIN } from '@/lib/hreflang'

type PageLang = 'ru' | 'en'

const COPY = {
  ru: { home: 'Главная', crumb: 'Авторы', column: 'Колонка', articles: 'Статьи автора', empty: 'Статей пока нет.' },
  en: { home: 'Home', crumb: 'Authors', column: 'Column', articles: 'Articles by the author', empty: 'No articles yet.' },
}

export async function generateAuthorMetadata(slug: string, lang: PageLang): Promise<Metadata> {
  const a = getAuthor(slug)
  if (!a) return { robots: { index: false, follow: false } }
  const c = COPY[lang]
  return {
    title: `${c.column}: ${a.name[lang]} | Balinsky`,
    description: a.bio[lang][0],
    alternates: {
      canonical: authorPath(slug, lang),
      languages: {
        ru: `${SITE_ORIGIN}${authorPath(slug, 'ru')}`,
        en: `${SITE_ORIGIN}${authorPath(slug, 'en')}`,
        'x-default': `${SITE_ORIGIN}${authorPath(slug, 'ru')}`,
      },
    },
  }
}

export async function AuthorPage({ slug, lang }: { slug: string; lang: PageLang }) {
  const a = getAuthor(slug)
  if (!a) notFound()
  const c = COPY[lang]
  const articles = (await loadAllKnowledge(lang)).filter(k => k.author?.slug === slug)
  const knowledgeRoot = switchLangPath('/ru/znaniya', lang)
  const name = a.name[lang]

  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: a.role[lang],
    description: a.bio[lang].join(' '),
    url: `${SITE_ORIGIN}${authorPath(slug, lang)}`,
    sameAs: a.links.map(l => l.url),
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: switchLangPath('/ru', lang) },
          { label: c.crumb },
          { label: name },
        ]} />

        <section className="mt-4 max-w-3xl">
          <p className="text-[13px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{c.column}</p>
          <div className="flex items-center gap-4 mb-4">
            {a.photo ? (
              <Image src={a.photo} alt={name} width={64} height={64} className="rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 shrink-0 rounded-full bg-[var(--color-search-bg)] flex items-center justify-center text-[20px] font-semibold text-[var(--color-text-muted)]">
                {name.split(/[\s·]/).filter(Boolean).map(s => s[0]).join('').slice(0, 2)}
              </div>
            )}
            <div>
              <h1 className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight text-[var(--color-text)]">{name}</h1>
              <p className="text-[14px] text-[var(--color-text-muted)]">{a.role[lang]}</p>
            </div>
          </div>
          <div className="space-y-3 text-[16px] leading-relaxed text-[var(--color-text)] max-w-[68ch]">
            {a.bio[lang].map(p => <p key={p}>{p}</p>)}
          </div>
          <ul className="flex flex-wrap gap-3 mt-6">
            {a.links.map(l => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-[14px] text-[var(--color-text)] no-underline hover:border-[var(--color-primary)]">
                  <ExternalLink size={14} /> {l.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-4">{c.articles}</h2>
          {articles.length === 0 ? (
            <p className="text-[14px] text-[var(--color-text-muted)]">{c.empty}</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map(r => (
                <li key={r.id}>
                  <Link href={`${knowledgeRoot}/${lang === 'ru' ? r.slug : enKnowledgeSlug(r.slug)}`} className="block h-full rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[var(--color-text)] hover:border-[var(--color-primary)]">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {r.photo ? (
                        <Image src={r.photo} alt={r.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                      ) : (
                        <ArticleCover title={r.title} slug={r.slug} />
                      )}
                    </div>
                    <div className="p-3 text-[15px] font-medium leading-snug">{r.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
