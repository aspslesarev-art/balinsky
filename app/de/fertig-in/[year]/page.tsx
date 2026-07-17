import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ComplexCard, type ComplexCardData } from '@/components/ComplexCard'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const VALID_YEARS = new Set(['2023', '2024', '2025', '2026', '2027', '2028'])
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Params = Promise<{ year: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { year } = await params
  if (!VALID_YEARS.has(year)) return { robots: { index: false, follow: false } }
  return {
    title: `Bali residential complexes completed in ${year} — verified projects | Balinsky`,
    description: `Bali residential complexes with completion year ${year}. Ready units, real schedule, PBG/SLF permits, developer contacts.`,
    alternates: {
      canonical: `/de/fertig-in/${year}`,
      languages: {
        ru: `${SITE_URL}/ru/sdano/${year}`,
        en: `${SITE_URL}/de/fertig-in/${year}`,
        'x-default': `${SITE_URL}/ru/sdano/${year}`,
      },
    },
    openGraph: { title: `Bali residential complexes completed in ${year}`, type: 'website' },
    twitter: { card: 'summary_large_image' },
  }
}

export const revalidate = 86400

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

export default async function Page({ params }: { params: Params }) {
  const { year } = await params
  if (!VALID_YEARS.has(year)) notFound()

  const { data: rows } = await sb
    .from('raw_complexes')
    .select('airtable_id, data, slug, cover_url')
    .limit(500)

  const matched: (ComplexCardData & { id: string })[] = []
  for (const r of (rows ?? []) as Array<{ airtable_id: string; data: Record<string, unknown>; slug: string | null; cover_url: string | null }>) {
    const y = firstString(r.data['Year of completion ']) ?? firstString(r.data['Year of completion'])
    if (y !== year) continue
    if (!r.slug) continue
    const name = firstString(r.data['Project'])
    if (!name) continue
    matched.push({
      id: r.airtable_id,
      slug: r.slug,
      name,
      location: firstString(r.data['Location 2']) ?? firstString(r.data['Location']),
      types: firstString(r.data['Типы юнитов']),
      permit: firstString(r.data['Разрешительные документы']),
      readiness: 100,
      coverUrl: r.cover_url,
      photos: [],
      photoCount: r.cover_url ? 1 : 0,
      villaPriceFrom: null, villaPriceTo: null,
      aptPriceFrom: null, aptPriceTo: null,
    })
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/de` },
      { '@type': 'ListItem', position: 2, name: 'Residential complexes', item: `${SITE_URL}/de/wohnanlagen` },
      { '@type': 'ListItem', position: 3, name: `Completed ${year}`, item: `${SITE_URL}/de/fertig-in/${year}` },
    ],
  }

  const isPast = Number(year) < 2026

  return (
    <>
      <Header active="zhilye-kompleksy" />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Home', href: '/de' },
          { label: 'Residential complexes', href: '/de/wohnanlagen' },
          { label: `Completed ${year}` },
        ]} />

        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          {isPast ? `Bali residential complexes completed in ${year}` : `Bali residential complexes scheduled for ${year}`}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">
          {matched.length} {matched.length === 1 ? 'complex' : 'complexes'}
        </div>

        <section className="max-w-3xl mb-8 text-[15px] leading-[1.7] text-[#1f2937] space-y-3">
          <p>
            {isPast
              ? `Bali residential complexes that completed construction in ${year}. All units passed final inspection, hold an SLF certificate, and can be legally rented out or occupied.`
              : `Bali residential complexes with a stated ${year} completion date. Some projects are in the final construction stage, others still off-plan. Always cross-check actual progress against the stated schedule before transacting.`}
          </p>
          <p>
            Every complex card lists permits (PBG, SLF), photo and on-the-ground video, developer info and a manager contact.
            Real neighbour-level rental yield via <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)] no-underline hover:underline">estatemarket.io</a> integration.
          </p>
        </section>

        {matched.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            No matching complexes yet. Browse the <Link href="/de/wohnanlagen" className="text-[var(--color-primary)] no-underline hover:underline">full catalogue</Link>.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {matched.map(c => <ComplexCard key={c.id} c={c} lang="de" />)}
          </div>
        )}

        <section className="mt-12 mb-8 max-w-3xl">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">See also</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[...VALID_YEARS].filter(y => y !== year).slice(0, 6).map(y => (
              <li key={y}>
                <Link href={`/de/fertig-in/${y}`} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors">
                  Complexes completed in {y}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/de/bali-immobilien-investment" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors">
                Bali property investment guide
              </Link>
            </li>
          </ul>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <div className="h-16" />
      </PageContainer>
      <Footer lang="de" />
    </>
  )
}
