import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, ExternalLink, Building2, HardHat } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { loadAllNews, loadNewsBySlug } from '@/lib/news'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const n = await loadNewsBySlug(slug)
  if (!n) return { robots: { index: false, follow: false } }
  return {
    title: `${n.title} | Balinsky`,
    description: n.seoDescription ?? (n.body?.slice(0, 160) ?? n.title),
    alternates: { canonical: `/ru/novosti/${n.slug}` },
    openGraph: {
      title: n.title,
      description: n.seoDescription ?? undefined,
      images: n.photo ? [n.photo] : undefined,
      type: 'article',
      publishedTime: n.date ?? undefined,
    },
  }
}

export default async function NewsDetailPage({ params }: { params: Params }) {
  const { slug } = await params
  const n = await loadNewsBySlug(slug)
  if (!n) notFound()

  const date = fmtDate(n.date)
  const allNews = await loadAllNews()
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
    mainEntityOfPage: `${SITE_URL}/ru/novosti/${n.slug}`,
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Новости', href: '/ru/novosti' },
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
                <Link href={`/ru/zastrojshhiki/${n.developers[0].slug}`} className="inline-flex items-center gap-1.5 text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline">
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
            <div className="w-full mb-8 rounded-2xl overflow-hidden bg-[var(--color-search-bg)] aspect-[16/9]">
              <img src={n.photo} alt={n.title} className="w-full h-full object-cover" />
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
                <ExternalLink size={14} /> Смотреть видео
              </a>
            </div>
          )}

          {n.externalUrl && (
            <div className="mt-3">
              <a href={n.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-[14px] hover:border-[var(--color-primary)] no-underline">
                <ExternalLink size={14} /> Источник
              </a>
            </div>
          )}
        </article>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">
              Ещё от {n.developers[0].name}
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(r => (
                <li key={r.id}>
                  <Link href={`/ru/novosti/${r.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    {r.photo ? (
                      <img src={r.photo} alt={r.title} className="w-full h-[120px] object-cover" />
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
