// EN twin of /ru/investicii/[district]. Same data, English commercial
// vocabulary, mirrors the pillar's framework narrowed to a single
// district.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, ChevronRight, AlertTriangle, MapPin, Calculator } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { getDistrictCopy } from '@/lib/districts'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = 'May 15, 2026'

type Params = Promise<{ district: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { district } = await params
  const copy = getDistrictCopy(district, 'uk')
  if (!copy) return { robots: { index: false, follow: false } }
  const priceFrom = copy.highlights.find(h => /entry|from/i.test(h.label))?.value
  const yieldR    = copy.highlights.find(h => /yield/i.test(h.label))?.value
  return {
    title: `${copy.name} Bali property investment — ${yieldR ?? '8-15%'} yield, prices ${priceFrom ?? ''} | Balinsky`,
    description: `Invest in property in ${copy.name}, Bali — real net yield ${yieldR ?? '8-15%'} per year, entry from ${priceFrom ?? '$130K'}. Leasehold, PT PMA, ROI calculation.`,
    alternates: {
      canonical: `/uk/investytsiyi-nerukhomist-bali/${district}`,
      languages: {
        ru: `${SITE_URL}/ru/investicii/${district}`,
        uk: `${SITE_URL}/uk/investytsiyi-nerukhomist-bali/${district}`,
        'x-default': `${SITE_URL}/ru/investicii/${district}`,
      },
    },
    openGraph: {
      title: `${copy.name} Bali property investment — 2026 guide`,
      description: `Yield ${yieldR ?? '8-15%'}, entry ${priceFrom ?? 'from $130K'}, leasehold and PT PMA.`,
      type: 'article',
      url: `/uk/investytsiyi-nerukhomist-bali/${district}`,
    },
    twitter: { card: 'summary_large_image' },
  }
}

export const revalidate = 86400

export default async function Page({ params }: { params: Params }) {
  const { district } = await params
  const copy = getDistrictCopy(district, 'uk')
  if (!copy) notFound()

  const priceFrom = copy.highlights.find(h => /entry|from/i.test(h.label))?.value
  const yieldR    = copy.highlights.find(h => /yield/i.test(h.label))?.value
  const adr       = copy.highlights.find(h => /adr/i.test(h.label))?.value
  const occupancy = copy.highlights.find(h => /occupancy/i.test(h.label))?.value

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/en` },
      { '@type': 'ListItem', position: 2, name: 'Bali property investment', item: `${SITE_URL}/uk/investytsiyi-nerukhomist-bali` },
      { '@type': 'ListItem', position: 3, name: copy.name, item: `${SITE_URL}/uk/investytsiyi-nerukhomist-bali/${district}` },
    ],
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Home', href: '/uk' },
          { label: 'Bali property investment', href: '/uk/investytsiyi-nerukhomist-bali' },
          { label: copy.name },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              {copy.name} Bali property investment — 2026 guide
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">{copy.hero}</p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Updated: {UPDATED}</p>
          </header>

          <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {copy.highlights.map(h => (
              <div key={h.label} className="rounded-xl border border-[var(--color-border)] p-4 bg-white">
                <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{h.label}</div>
                <div className="text-[20px] font-semibold text-[#111827]">{h.value}</div>
              </div>
            ))}
          </section>

          <section className="mb-10 space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
            {copy.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </section>

          <section className="mb-10 rounded-2xl border border-[var(--color-border)] p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={20} className="text-[var(--color-primary)]" />
              <strong>Typical case: 2BR property in {copy.name}</strong>
            </div>
            <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
              {priceFrom && <li>Entry price: {priceFrom}</li>}
              {adr && <li>ADR (average daily rate): {adr}</li>}
              {occupancy && <li>Managed occupancy: {occupancy}</li>}
              {yieldR && <li>Net yield: {yieldR} annual</li>}
              <li>Leasehold 25-50 years from private owners; freehold via PT PMA from larger developers</li>
              <li>Payback: 7-12 years depending on price segment and yield</li>
            </ul>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              Per-property ROI math runs on every villa/apartment page in this district with real neighbour data from <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a>.
            </p>
          </section>

          <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Key district-specific risks</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>Leasehold under 30 years remaining</strong> — won&apos;t recoup + resell at profit. Insist on 35+ years.</li>
                  <li><strong>Property without SLF</strong> — legal rental impossible, ROI model doesn&apos;t work.</li>
                  <li><strong>RDTR zoning</strong> — some plots under review. Verify status before transacting.</li>
                  <li><strong>«Developer-guaranteed yield»</strong> is typically inflated by 30-50% — cross-check with Booking neighbour data.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Best for</h2>
            <div className="flex flex-wrap gap-2">
              {copy.bestFor.map(tag => (
                <span key={tag} className="inline-block text-[14px] bg-white border border-[var(--color-border)] rounded-full px-4 py-2">{tag}</span>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Next step</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href={`/uk/vily/${district}`} className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villas in {copy.name}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Catalogue with photos, prices and permits.</p>
              </Link>
              <Link href={`/uk/apartamenty/${district}`} className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Apartments in {copy.name}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Units in managed complexes.</p>
              </Link>
              <Link href={`/uk/kompleksy/${district}`} className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Residential complexes in {copy.name}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Off-plan and ready projects.</p>
              </Link>
              <Link href="/uk/investytsiyi-nerukhomist-bali" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1 inline-flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-[var(--color-primary)]" /> Full Bali investment guide
                </h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Leasehold, PT PMA, taxes — all districts.</p>
              </Link>
            </div>
          </section>

          <section className="mb-10 flex items-center gap-2 text-[14px] text-[var(--color-text-muted)]">
            <MapPin size={14} />
            See the district on map — <Link href={`/uk/vily/${district}/karta`} className="text-[var(--color-primary)] no-underline hover:underline">villa map</Link>
            <ChevronRight size={14} />
          </section>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      </PageContainer>
      <Footer lang="uk" />
    </>
  )
}
