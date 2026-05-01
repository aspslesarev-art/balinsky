import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BedDouble, MapPin, Send, Tag } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { loadRentalBySlug } from '@/lib/rental'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

function fmtUsd(n: number): string { return '$' + Math.round(n).toLocaleString('en-US') }

function tgHref(handle: string): string | null {
  const v = handle.trim().replace(/^@/, '')
  if (!v) return null
  return `https://t.me/${encodeURIComponent(v)}`
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const r = await loadRentalBySlug(slug)
  if (!r) return { robots: { index: false, follow: false } }
  const desc = r.notes?.slice(0, 160)
    ?? `${r.type ?? 'Объект'} в аренду на Бали${r.location ? `, ${r.location}` : ''}. ${fmtUsd(r.priceMonthUsd)} / мес.`
  return {
    title: `${r.title} — ${fmtUsd(r.priceMonthUsd)}/мес | Balinsky`,
    description: desc,
    alternates: { canonical: `/ru/arenda/o/${r.slug}` },
    openGraph: {
      title: r.title,
      description: desc,
      images: r.photos.length > 0 ? r.photos.slice(0, 4) : undefined,
      type: 'article',
    },
  }
}

export default async function RentalDetailPage({ params }: { params: Params }) {
  const { slug } = await params
  const r = await loadRentalBySlug(slug)
  if (!r) notFound()

  const tg = r.telegram ? tgHref(r.telegram) : null

  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: r.title,
    url: `${SITE_URL}/ru/arenda/o/${r.slug}`,
    image: r.photos.slice(0, 5),
    offers: {
      '@type': 'Offer',
      price: Math.round(r.priceMonthUsd),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/ru/arenda/o/${r.slug}`,
    },
  }

  return (
    <>
      <Header active="arenda" />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Аренда', href: '/ru/arenda' },
          { label: r.title },
        ]} />

        {r.photos.length > 0 && (
          <section className="mb-6 mt-2">
            <PhotoGalleryHero photos={r.photos} alt={r.title} />
          </section>
        )}

        <section className="mb-10">
          <h1 className="text-[26px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-3">
            {r.title}
          </h1>
          <div className="text-[15px] text-[var(--color-text-muted)] flex items-center flex-wrap gap-x-5 gap-y-1 mb-4">
            {r.type && <span>{r.type}</span>}
            {r.bedrooms != null && <span className="inline-flex items-center gap-1.5"><BedDouble size={14} /> {r.bedrooms} BR</span>}
            {r.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {r.location}, Бали</span>}
            {r.priceSegment && <span className="inline-flex items-center gap-1.5"><Tag size={14} /> {r.priceSegment}</span>}
          </div>
          <div className="text-[28px] font-semibold text-[#111827]">
            {fmtUsd(r.priceMonthUsd)} <span className="text-[14px] font-normal text-[var(--color-text-muted)]">/ мес</span>
          </div>
        </section>

        {r.notes && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-3">
              Описание
            </h2>
            <div className="prose-balinsky max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
              {r.notes}
            </div>
          </section>
        )}

        {tg && (
          <section className="mb-10">
            <a
              href={tg}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-medium no-underline transition-colors"
            >
              <Send size={16} /> Написать в Telegram
            </a>
          </section>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
