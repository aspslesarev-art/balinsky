import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, ExternalLink, Building2, HardHat } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { loadAllPromo, loadPromoBySlug } from '@/lib/promo'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const p = await loadPromoBySlug(slug)
  if (!p) return { robots: { index: false, follow: false } }
  return {
    title: `${p.title} | Balinsky`,
    description: p.seoDescription ?? (p.body?.slice(0, 160) ?? p.title),
    alternates: { canonical: `/ru/akcii/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.seoDescription ?? undefined,
      images: p.photo ? [p.photo] : undefined,
    },
  }
}

export default async function PromoDetailPage({ params }: { params: Params }) {
  const { slug } = await params
  const p = await loadPromoBySlug(slug)
  if (!p) notFound()

  const all = await loadAllPromo()
  const related = p.developers[0]?.slug
    ? all.filter(x => x.id !== p.id && x.developers.some(d => d.slug === p.developers[0].slug)).slice(0, 4)
    : []

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Акции', href: '/ru/akcii' },
          { label: p.title },
        ]} />

        <article className="mt-4">
          <h1 className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight text-[#111827] mb-4">
            {p.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--color-text-muted)] mb-6">
            {p.expiresAt && (
              <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> До {fmtDate(p.expiresAt)}</span>
            )}
            {p.developers[0] && (
              p.developers[0].slug ? (
                <Link href={`/ru/zastrojshhiki/${p.developers[0].slug}`} className="inline-flex items-center gap-1.5 text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline">
                  <HardHat size={14} /> {p.developers[0].name}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5"><HardHat size={14} /> {p.developers[0].name}</span>
              )
            )}
            {p.complexNames[0] && (
              <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {p.complexNames[0]}</span>
            )}
          </div>

          {p.photo && (
            <div className="w-full mb-8 rounded-2xl overflow-hidden bg-[var(--color-search-bg)] aspect-[16/9]">
              <img src={p.photo} alt={p.title} className="w-full h-full object-cover" />
            </div>
          )}
          {p.body && (
            <div className="text-[16px] leading-[1.7] text-[var(--color-text)] whitespace-pre-wrap">{p.body}</div>
          )}
          {p.externalUrl && (
            <div className="mt-6">
              <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium no-underline hover:bg-[var(--color-primary-hover)]">
                <ExternalLink size={14} /> Подробнее
              </a>
            </div>
          )}
        </article>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">
              Ещё акции от {p.developers[0].name}
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(r => (
                <li key={r.id}>
                  <Link href={`/ru/akcii/${r.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    {r.photo ? (
                      <img src={r.photo} alt={r.title} className="w-full h-[120px] object-cover" />
                    ) : (
                      <div className="w-full h-[120px] bg-[var(--color-search-bg)] flex items-center justify-center text-2xl">🎁</div>
                    )}
                    <div className="p-3 text-[14px] font-medium leading-snug line-clamp-3">{r.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
