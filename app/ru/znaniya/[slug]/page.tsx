import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { loadAllKnowledge, loadKnowledgeBySlug } from '@/lib/knowledge'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const k = await loadKnowledgeBySlug(slug)
  if (!k) return { robots: { index: false, follow: false } }
  return {
    title: `${k.title} | Balinsky`,
    description: k.body.slice(0, 160).replace(/\s+/g, ' ').trim(),
    alternates: { canonical: `/ru/znaniya/${k.slug}` },
    openGraph: {
      title: k.title,
      images: k.photo ? [k.photo] : undefined,
      type: 'article',
    },
  }
}

export default async function KnowledgeDetailPage({ params }: { params: Params }) {
  const { slug } = await params
  const k = await loadKnowledgeBySlug(slug)
  if (!k) notFound()

  const all = await loadAllKnowledge()
  const related = all.filter(x => x.id !== k.id).slice(0, 4)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: k.title,
    image: k.photo ? [k.photo] : undefined,
    datePublished: k.createdTime ?? undefined,
    publisher: { '@type': 'Organization', name: 'Balinsky' },
    mainEntityOfPage: `${SITE_URL}/ru/znaniya/${k.slug}`,
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Знания', href: '/ru/znaniya' },
          { label: k.title },
        ]} />

        <article className="mt-4">
          <h1 className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight text-[#111827] mb-6">
            {k.title}
          </h1>

          {k.photo && (
            <div className="w-full mb-8 rounded-2xl overflow-hidden bg-[var(--color-search-bg)] aspect-[16/9]">
              <img src={k.photo} alt={k.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="text-[16px] leading-[1.7] text-[var(--color-text)] whitespace-pre-wrap">
            {k.body}
          </div>

          {k.externalUrl && (
            <div className="mt-6">
              <a href={k.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[14px] hover:border-[var(--color-primary)] no-underline">
                <ExternalLink size={14} /> Источник
              </a>
            </div>
          )}
        </article>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">Ещё статьи</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(r => (
                <li key={r.id}>
                  <Link href={`/ru/znaniya/${r.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    <div className="w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {r.photo ? (
                        <img src={r.photo} alt={r.title} className="w-full h-full object-cover" />
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
