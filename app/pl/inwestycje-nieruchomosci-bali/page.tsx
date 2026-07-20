// EN mirror of /ru/investicii-v-nedvizhimost-bali. Same pillar, same
// schema markup, English tone calibrated for foreign investors searching
// «bali property investment», «bali real estate ROI», «bali leasehold».

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, Building2, FileCheck2, Calculator, ShieldCheck, BarChart3, ChevronRight, AlertTriangle, MapPin } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = 'May 15, 2026'

export const metadata: Metadata = {
  title: 'Bali Property Investment 2026 — Real Yields, Leasehold, Taxes | Balinsky',
  description: 'Complete Bali property investment guide for foreigners: real 8-15% net yields, leasehold vs PT PMA structures, taxes, ROI calculations and case studies across Canggu, Bukit, Ubud.',
  alternates: {
    canonical: '/pl/inwestycje-nieruchomosci-bali',
    languages: {
      ru: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
      pl: `${SITE_URL}/pl/inwestycje-nieruchomosci-bali`,
      'x-default': `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
    },
  },
  openGraph: {
    title: 'Bali Property Investment 2026 — Complete Guide for Foreigners',
    description: '8-15% net yields, leasehold vs PT PMA, taxes, ROI by district. Real numbers from Booking-grade analytics and buyer case studies.',
    type: 'article',
    url: '/pl/inwestycje-nieruchomosci-bali',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bali Property Investment 2026',
    description: 'Real yields, leasehold, taxes, ROI by district. Verified data.',
    images: ['/balina.jpg'],
  },
}

const FAQ = [
  { q: 'What is the realistic rental yield for a Bali villa in 2026?',
    a: 'Based on live Booking-grade data via estatemarket.io: 8-12% net annual yield in Canggu and Bukit at 70-80% occupancy with professional management. Premium-segment villas (new builds with ocean views, 4+ bedrooms) reach up to 15%. Ubud and Sanur yield 6-9% due to lower ADR. These are net figures, after management fees (15-20% of revenue), utilities, depreciation, taxes and vacancy.' },
  { q: 'Leasehold or PT PMA — which structure should a foreign investor pick?',
    a: 'Leasehold (long-term land lease, 25-80 years) suits 1-2 individual property purchases. Cheaper, faster (1-2 months), no corporate structure needed. PT PMA (Indonesian company with foreign shareholders) makes sense for a portfolio of 3+ units or commercial real estate. It enables freehold ownership but requires $25K in paid-up capital, annual reporting and corporate tax.' },
  { q: 'What taxes does a foreigner pay when buying and owning property in Bali?',
    a: 'On purchase: 5% acquisition tax (BPHTB) + 1-2% notary + 3-5% agent commission if applicable. On ownership: PBB (property tax) 0.1-0.3% of cadastral value annually. On rental income: 20% personal income tax for foreigners (can be reduced through PT PMA). On sale: 2.5% income tax on the sale price.' },
  { q: 'How many years until a Bali villa pays back?',
    a: 'At 10% annual yield — 10 years. At 12% — 8.3 years. In practice: 7-10 years in Canggu/Bukit with active management; 12-15 years in quieter districts. Watch out for leaseholds under 30 years remaining at purchase — they often don\'t complete a full payback cycle plus profitable resale.' },
  { q: 'What are PBG and SLF, and why are they critical?',
    a: 'PBG (Persetujuan Bangunan Gedung) is the building permit, issued before construction. SLF (Sertifikat Laik Fungsi) is the certificate of fitness for use, issued upon completion. Without SLF, the unit cannot legally be rented out — your investment model doesn\'t work officially. Every property in the Balinsky catalogue is QA-checked for these documents before publication — that\'s what makes us an editorial shortlist, not an aggregator.' },
  { q: 'Can I get an Indonesian residence permit through property investment?',
    a: 'There is no direct «property for residency» scheme. There is a KITAS Investor Visa (from $40K invested in PT PMA), Second Home Visa (from $130K deposited in an Indonesian bank), Golden Visa (from $350K individual investment, $25M for companies). Buying a villa alone does not grant residency — you need either a corporate or deposit structure.' },
]

const REGIONS = [
  { name: 'Canggu', slug: 'canggu', yieldRange: '10-13%', priceFrom: '$180K', niche: 'trend district, events, networking, daily rentals' },
  { name: 'Bukit (Uluwatu/Pandawa/Ungasan)', slug: 'uluwatu', yieldRange: '10-15%', priceFrom: '$130K', niche: 'premium ocean views, surf community, high ADR' },
  { name: 'Ubud', slug: 'ubud', yieldRange: '6-9%', priceFrom: '$120K', niche: 'wellness, yoga tourism, longer stays' },
  { name: 'Sanur', slug: 'sanur', yieldRange: '5-8%', priceFrom: '$150K', niche: 'family segment, low risk, steady demand' },
  { name: 'Nusa Dua', slug: 'nusa-dua', yieldRange: '7-10%', priceFrom: '$200K', niche: 'premium hotels nearby, corporate travel' },
  { name: 'Pererenan', slug: 'pererenan', yieldRange: '9-12%', priceFrom: '$160K', niche: 'quieter Canggu adjacent, growing trend area' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/en` },
      { '@type': 'ListItem', position: 2, name: 'Bali property investment', item: `${SITE_URL}/pl/inwestycje-nieruchomosci-bali` },
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Home', href: '/pl' },
          { label: 'Bali property investment' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Bali Property Investment — 2026 Guide
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Real 8-15% net annual yields, ROI breakdown across 6 districts, legal structures (leasehold and PT PMA),
              taxes for foreign owners, and an editorial shortlist of properties with verified permits.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Updated: {UPDATED}</p>
          </header>

          <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: TrendingUp, n: '8–15%', label: 'annual net yield' },
              { Icon: Building2, n: '828+', label: 'units in catalogue' },
              { Icon: ShieldCheck, n: '100%', label: 'PBG + SLF verified' },
              { Icon: BarChart3, n: '6', label: 'investment districts' },
            ].map(({ Icon, n, label }) => (
              <div key={label} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Icon size={20} className="text-[var(--color-primary)] mb-2" />
                <div className="text-[24px] font-semibold text-[#111827]">{n}</div>
                <div className="text-[13px] text-[var(--color-text-muted)]">{label}</div>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Why Bali Is the #1 Market for Foreign Investors in 2026
            </h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>
                Bali is the one tourist market in Southeast Asia where a foreigner can legally hold property despite
                Indonesia&apos;s freehold-for-foreigners ban. Through leasehold and PT PMA structures, transactions close fast
                and cleanly, and tax rates are among the lowest in the region.
              </p>
              <p>
                In parallel, the island holds its position as the regional tourism heavyweight: 6-7 million international
                visitors annually, 70-85% occupancy in Canggu and Bukit hotels and rentals, average daily rate (ADR) growing
                8-12% year-over-year since 2023. Per <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a> —
                the public Booking analytics we surface in every property card — real neighbour-level yield data is available
                literally street-by-street within a 1 km radius.
              </p>
              <p>
                That is the rare combination: <strong>high tourist demand + legal foreign-friendly structures + low entry cost</strong>
                ($120-200K for a starter unit). No other Southeast Asian market combines all three — Phuket and Ho Chi Minh
                are pricier and harder on transactions, Samui and Langkawi have weaker demand.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Yields by District — Real 2026 Numbers
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-6">
              These ranges average comparable Booking neighbours across the last 12 months, net of management fees,
              depreciation and taxes. Spread shown as 5th and 95th percentile.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">District</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Yield</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">From</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] hidden md:table-cell">Character</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {REGIONS.map(r => (
                    <tr key={r.slug} className="border-b border-[var(--color-border)]">
                      <td className="py-3 px-3 font-semibold text-[#111827]">{r.name}</td>
                      <td className="py-3 px-3 text-[var(--color-primary)] font-semibold">{r.yieldRange}</td>
                      <td className="py-3 px-3">{r.priceFrom}</td>
                      <td className="py-3 px-3 hidden md:table-cell text-[var(--color-text-muted)]">{r.niche}</td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/pl/wille`} className="text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                          browse <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Legal Structures — Leasehold vs PT PMA
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">Leasehold</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Long-term land lease from a local owner — 25-80 years, often extendable.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Minimum paperwork and formalities</li>
                  <li>Closes in 1-2 months at a PPAT notary</li>
                  <li>Fits 1-2 individual purchases</li>
                  <li>Cheaper than PT PMA by $5-15K per deal</li>
                  <li className="text-[var(--color-text-muted)]">You don&apos;t own the land — only the right to use</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">PT PMA</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Indonesian company with foreign shareholders — can hold freehold land.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Freehold ownership</li>
                  <li>Fits a portfolio of 3+ units</li>
                  <li>Enables legal rental operations</li>
                  <li>$25K paid-up capital + annual reporting</li>
                  <li className="text-[var(--color-text-muted)]">22% corporate income tax</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              Full transaction guide on the <Link href="/pl/jak-kupic" className="text-[var(--color-primary)] no-underline hover:underline">«How to buy property in Bali»</Link> page.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              ROI Calculation — Typical Case
            </h2>
            <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-[var(--color-primary)]" />
                <strong>2BR villa in Canggu, $250K, 30-year leasehold</strong>
              </div>
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                <li>Purchase price: $250,000</li>
                <li>Transaction costs (notary, BPHTB tax, due diligence): ~$15,000</li>
                <li>Average rate: $200/night × 75% occupancy × 365 days = $54,750/year</li>
                <li>Expenses (mgmt 18%, utilities, furniture depreciation, 20% tax): ~$23,500/year</li>
                <li>Net cash flow: ~$31,250/year → 12.5% annual yield on the $250K outlay</li>
                <li>Payback: ~8 years to break even, 22 useful rental years remain on the lease</li>
              </ul>
              <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
                A similar calculator runs automatically on every villa page in our catalogue, populated with real
                neighbour data from <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a>.
              </p>
            </div>
          </section>

          <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Risks Sellers Don&apos;t Talk About</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>Leasehold under 30 years.</strong> You won&apos;t recoup the investment and still resell at a profit. Insist on 35+ years remaining at purchase.</li>
                  <li><strong>Property without SLF.</strong> Legal rental is impossible — your yield model doesn&apos;t exist on paper.</li>
                  <li><strong>Developer without PBG.</strong> Construction can be halted by authorities and your deposit won&apos;t be refunded.</li>
                  <li><strong>Agricultural-zone land.</strong> Some Canggu/Pererenan plots are being reclassified — check the RDTR plan.</li>
                  <li><strong>Real occupancy below promised.</strong> Developer-guaranteed yields are typically inflated by 30-50%. Cross-check with Booking neighbour data.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              How We Verify Catalogue Properties
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-4">
              Every property in Balinsky passes an editorial QA before publication. This is not a catch-all aggregator —
              only projects where permits (PBG, SLF), land structure (zoning, RDTR) and developer (PT registration) have been
              verified by hand.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <FileCheck2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Documents</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PBG, SLF, IMB, AJB / Notarial Deed — checked against ATR/BPN ministry registers.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Building2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Developer</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PT registration, completed project portfolio, reputation in the local agent community.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <MapPin size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Location</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">On-the-ground site visit, photo and video from the land, infrastructure check within 500m.</p>
              </div>
            </div>
            <div className="mt-6 text-[14px]">
              More on <Link href="/pl/o-nas" className="text-[var(--color-primary)] no-underline hover:underline">«About Balinsky»</Link>.
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Next Steps
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/pl/wille" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villa catalogue</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Every villa with photos, prices, permits and ROI math.</p>
              </Link>
              <Link href="/pl/apartamenty" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Apartment catalogue</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Units in managed complexes — the lowest entry threshold.</p>
              </Link>
              <Link href="/pl/kompleksy" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Residential complexes</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Off-plan and ready complexes with management, renders and completion dates.</p>
              </Link>
              <Link href="/pl/jak-kupic" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">How to buy — step-by-step</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Seven steps of the transaction, ownership structures, real costs and pitfalls.</p>
              </Link>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {FAQ.map((it, i) => (
                <details key={i} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-semibold text-[#111827]">
                    <span>{it.q}</span>
                    <ChevronRight size={18} className="shrink-0 transition-transform [details[open]_&]:rotate-90" />
                  </summary>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">{it.a}</p>
                </details>
              ))}
            </div>
          </section>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </PageContainer>
      <Footer lang="pl" />
    </>
  )
}
