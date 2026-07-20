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
import { enKnowledgeSlug } from '@/lib/knowledge-en-slugs'
import { ArticleCover } from '@/components/ArticleCover'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

import type { KnowledgeAuthor } from '@/lib/knowledge'

type LangCopy = {
  home: string; knowledgeCrumb: string; source: string; moreArticles: string
  published: string; updated: string; locale: string
  defaultAuthor: KnowledgeAuthor
}
const COPY: Record<Lang, LangCopy> = {
  ru: {
    home: 'Главная', knowledgeCrumb: 'Знания', source: 'Источник', moreArticles: 'Ещё статьи',
    published: 'Опубликовано', updated: 'Обновлено',
    defaultAuthor: { name: 'Андрей Балинский', role: 'Основатель Balinsky', photo: null, slug: null },
    locale: 'ru-RU',
  },
  en: {
    home: 'Home', knowledgeCrumb: 'Knowledge', source: 'Source', moreArticles: 'More articles',
    published: 'Published', updated: 'Updated',
    defaultAuthor: { name: 'Andrei Balinsky', role: 'Founder of Balinsky', photo: null, slug: null },
    locale: 'en-GB',
  },
  id: {
    home: 'Beranda', knowledgeCrumb: 'Pengetahuan', source: 'Sumber', moreArticles: 'Artikel lainnya',
    published: 'Diterbitkan', updated: 'Diperbarui',
    defaultAuthor: { name: 'Andrei Balinsky', role: 'Pendiri Balinsky', photo: null, slug: null },
    locale: 'id-ID',
  },
  fr: {
    home: 'Accueil', knowledgeCrumb: 'Connaissances', source: 'Source', moreArticles: 'Plus d\'articles',
    published: 'Publié', updated: 'Mis à jour',
    defaultAuthor: { name: 'Andrei Balinsky', role: 'Fondateur de Balinsky', photo: null, slug: null },
    locale: 'fr-FR',
  },
  de: {
    home: 'Startseite', knowledgeCrumb: 'Wissen', source: 'Quelle', moreArticles: 'Weitere Artikel',
    published: 'Veröffentlicht', updated: 'Aktualisiert',
    defaultAuthor: { name: 'Andrei Balinsky', role: 'Gründer von Balinsky', photo: null, slug: null },
    locale: 'de-DE',
  },
  zh: {
    home: '首页', knowledgeCrumb: '知识', source: '来源', moreArticles: '更多文章',
    published: '发布于', updated: '更新于',
    defaultAuthor: { name: 'Andrei Balinsky', role: 'Balinsky 创始人', photo: null, slug: null },
    locale: 'zh-CN',
  },
  nl: {
    home: 'Home', knowledgeCrumb: 'Kennis', source: 'Bron', moreArticles: 'Meer artikelen',
    published: 'Gepubliceerd', updated: 'Bijgewerkt',
    defaultAuthor: { name: 'Andrei Balinsky', role: 'Oprichter van Balinsky', photo: null, slug: null },
    locale: 'nl-NL',
  },
  ban: {
    home: 'Beranda', knowledgeCrumb: 'Pangweruh', source: 'Sumber', moreArticles: 'Artikel lianan',
    published: 'Kawedar', updated: 'Kaanyarin',
    defaultAuthor: { name: 'Andrei Balinsky', role: 'Pangadeg Balinsky', photo: null, slug: null },
    locale: 'id-ID',
  },
  pl: {
    home: 'Strona główna', knowledgeCrumb: 'Wiedza', source: 'Źródło', moreArticles: 'Więcej artykułów',
    published: 'Opublikowano', updated: 'Zaktualizowano',
    defaultAuthor: { name: 'Andrei Balinsky', role: 'Założyciel Balinsky', photo: null, slug: null },
    locale: 'pl-PL',
  },
  uk: {
    home: 'Головна', knowledgeCrumb: 'Знання', source: 'Джерело', moreArticles: 'Більше статей',
    published: 'Опубліковано', updated: 'Оновлено',
    defaultAuthor: { name: 'Andrei Balinsky', role: 'Засновник Balinsky', photo: null, slug: null },
    locale: 'uk-UA',
  },
}

function fmtDate(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return null }
}

export async function generateKnowledgeDetailMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const k = await loadKnowledgeBySlug(slug, lang)
  if (!k) return { robots: { index: false, follow: false } }
  const ruPath = `/ru/znaniya/${k.slug}`
  const enPath = `/en/knowledge/${enKnowledgeSlug(k.slug)}`
  const path = lang === 'ru' ? ruPath : switchLangPath(enPath, lang)
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
  const c = pickCopy(COPY, lang)
  const k = await loadKnowledgeBySlug(slug, lang)
  if (!k) notFound()
  const home = switchLangPath('/ru', lang)
  const knowledgeRoot = switchLangPath('/ru/znaniya', lang)

  const all = await loadAllKnowledge(lang)
  const related = all.filter(x => x.id !== k.id).slice(0, 4)

  const authorData = k.author ?? c.defaultAuthor
  const publishedDate = fmtDate(k.createdTime, c.locale)
  const updatedDate = fmtDate(k.lastModifiedTime, c.locale)
  const articleJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: k.title,
    image: k.photo ? [k.photo] : undefined,
    datePublished: k.createdTime ?? undefined,
    dateModified: k.lastModifiedTime ?? k.createdTime ?? undefined,
    author: {
      '@type': 'Person',
      name: authorData.name,
      ...(authorData.role ? { jobTitle: authorData.role } : {}),
      ...(authorData.photo ? { image: authorData.photo } : {}),
      ...((k.author && k.author.slug) ? { url: `${SITE_URL}${lang === 'ru' ? '/ru/avtory/' : '/en/authors/'}${k.author.slug}` } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Balinsky',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
    },
    mainEntityOfPage: `${SITE_URL}${lang === 'ru' ? `/ru/znaniya/${k.slug}` : switchLangPath(`/en/knowledge/${enKnowledgeSlug(k.slug)}`, lang)}`,
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
          <h1 className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight text-[#111827] mb-4">
            {k.title}
          </h1>

          <div className="flex items-center gap-3 mb-6 text-[13px] text-[var(--color-text-muted)] flex-wrap">
            <div className="flex items-center gap-2">
              {authorData.photo ? (
                <Image src={authorData.photo} alt={authorData.name} width={32} height={32} className="rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--color-search-bg)] flex items-center justify-center text-[12px] font-semibold text-[var(--color-text-muted)]">
                  {authorData.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
                </div>
              )}
              <div className="leading-tight">
                {k.author && k.author.slug ? (
                  <Link href={`${lang === 'ru' ? '/ru/avtory' : '/en/authors'}/${k.author.slug}`} className="text-[14px] font-medium text-[#111827] hover:text-[var(--color-primary-pressed)] no-underline">
                    {authorData.name}
                  </Link>
                ) : (
                  <span className="text-[14px] font-medium text-[#111827]">{authorData.name}</span>
                )}
                {authorData.role && <div className="text-[12px]">{authorData.role}</div>}
              </div>
            </div>
            {publishedDate && (
              <span className="before:content-['·'] before:mr-3 before:text-[var(--color-text-faint)]">
                {c.published} {publishedDate}
              </span>
            )}
            {updatedDate && updatedDate !== publishedDate && (
              <span className="before:content-['·'] before:mr-3 before:text-[var(--color-text-faint)]">
                {c.updated} {updatedDate}
              </span>
            )}
          </div>

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
                  <Link href={`${knowledgeRoot}/${lang === 'ru' ? r.slug : enKnowledgeSlug(r.slug)}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {r.photo ? (
                        <Image src={r.photo} alt={r.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                      ) : (
                        <ArticleCover title={r.title} slug={r.slug} />
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
