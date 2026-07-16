// EN mirror of /ru/zhizn-na-bali. Relocation hub for foreigners
// considering Bali — visas, taxes, schools, healthcare, monthly budget.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Plane, GraduationCap, Stethoscope, Wallet, Wifi, ChevronRight, FileCheck2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const UPDATED = 'May 15, 2026'

export const metadata: Metadata = {
  title: 'Living in Bali — Visas, Taxes, Schools, Healthcare 2026 | Balinsky',
  description: 'Bali relocation guide: KITAS, Second Home Visa, Golden Visa, resident foreigner taxes, international schools, BIMC and Siloam hospitals, real family budgets.',
  alternates: {
    canonical: '/fr/vivre-a-bali',
    languages: {
      ru: `${SITE_URL}/ru/zhizn-na-bali`,
      en: `${SITE_URL}/fr/vivre-a-bali`,
      'x-default': `${SITE_URL}/ru/zhizn-na-bali`,
    },
  },
  openGraph: {
    title: 'Living in Bali — 2026 Relocation Guide',
    description: 'KITAS, Second Home Visa, Golden Visa, resident taxes, schools, healthcare, family budget — from operators who\'ve lived here 5+ years.',
    type: 'article',
    url: '/fr/vivre-a-bali',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Living in Bali — 2026 Relocation Guide',
    description: 'Visas, taxes, schools, healthcare, budget.',
    images: ['/balina.jpg'],
  },
}

const FAQ = [
  { q: 'Which visa works for long-term relocation to Bali?',
    a: 'Baseline: B211A (tourist, up to 6 months with extensions) for a trial period. KITAS Investor (1-2 years, from $40K invested in a PT PMA) for entrepreneurs and investors. KITAS Working — through an Indonesian employer. Second Home Visa (5-10 years, $130K deposit in a local bank) for financially independent applicants. Golden Visa (5-10 years, $350K+ investment) — top-tier for HNW individuals.' },
  { q: 'What taxes does a foreign Bali resident pay?',
    a: 'After 183 days in Indonesia in a calendar year you become a tax resident. Progressive PIT: 5% up to IDR 60M (~$4K), 15% up to 250M, 25% up to 500M, 30% up to 5B, 35% above. Worldwide income, but offsets through double taxation treaties (Indonesia has DTAs with 70+ countries including US, UK, Singapore, Australia, EU members).' },
  { q: 'How much does international school cost?',
    a: 'Standard tier: Sunrise School, Australian Independent School, Cita Hati — $7-15K/year per primary-school child. Premium: Green School Bali — $20-28K, Australian International School — $18-25K. Preschool (ages 3-5) — $5-10K/year. Budget for two children in middle school: $20-35K/year.' },
  { q: 'What healthcare is available?',
    a: 'International standard: BIMC Kuta (Cleveland Clinic affiliate), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu. Specialist consultation $40-80, CT/MRI $200-400, emergency surgery $5-15K. International insurance is mandatory (Allianz, Cigna, Bupa) — $1500-3500/year per adult. Serious surgery and oncology typically routed to Singapore or Malaysia.' },
  { q: 'What\'s the monthly budget for a family of four?',
    a: 'Comfortable (two kids in international school, 3BR house with garden and pool in Umalas, helper 4 days/week, one car): $5500-7500/month = $66-90K/year. Premium (Green School, villa in Berawa, full-time driver and helper, two cars): $9000-13000/month = $108-156K/year. Minimum (no school, modest 2BR villa in Sanur): $2200-3000/month.' },
  { q: 'Can I work remotely from Bali — internet and infrastructure?',
    a: 'Yes. Business infrastructure is solid: fibre 200-1000 Mbps in Canggu, Berawa, Umalas, Sanur, most Bukit complexes. 24/7 coworking (Outpost, Tropical Nomad, Dojo, Soul & Surf). Electricity is stable, outages rare. KITAS Investor or B211A (with the new E33G digital nomad visa from October 2025) legally cover remote work.' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/fr` },
      { '@type': 'ListItem', position: 2, name: 'Living in Bali', item: `${SITE_URL}/fr/vivre-a-bali` },
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

  const SECTIONS = [
    { Icon: Plane, title: 'Visas & residence', body: 'KITAS Investor from $40K, Second Home Visa from $130K deposit, Golden Visa from $350K investment. Tourist B211A for the 6-month trial period.' },
    { Icon: FileCheck2, title: 'Resident taxes', body: 'Tax resident after 183 days in year. Progressive 5-35% bracket. DTA offsets available with 70+ countries — most Western and CIS markets covered.' },
    { Icon: GraduationCap, title: 'Schools', body: 'Sunrise / AIS / Cita Hati: $7-15K/year. Premium — Green School ($20-28K) and AIS Premium. Strong international community.' },
    { Icon: Stethoscope, title: 'Healthcare', body: 'BIMC, Siloam, Kasih Ibu — international-grade clinics. Insurance mandatory ($1500-3500/year). Major surgery routed to Singapore.' },
    { Icon: Wallet, title: 'Family budget', body: 'Family of 4: comfortable $66-90K/year, premium $108-156K/year. Baseline minimum without schools — from $2200/month.' },
    { Icon: Wifi, title: 'Remote work', body: 'Fibre 200-1000 Mbps in all investment districts. Coworking at Outpost / Tropical Nomad / Dojo. KITAS Investor or new E33G digital nomad visa cover remote work legally.' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Home', href: '/fr' },
          { label: 'Living in Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Living in Bali — Relocation Guide
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Residence permits through KITAS, Second Home and Golden Visa, foreigner-resident taxes, real family budgets,
              international schools, healthcare and remote-work infrastructure — collected from operators who&apos;ve lived
              on the island for 5+ years.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Updated: {UPDATED}</p>
          </header>

          <section className="mb-12 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {SECTIONS.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Icon size={22} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[15px] font-semibold text-[#111827] mb-1">{title}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">{body}</p>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Visas — what fits which situation</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>B211A — tourist visa.</strong> 60 days with extensions up to 6 months. Fits the trial period before committing to relocation. Cost $50-100 + agent fee $50-150.</p>
              <p><strong>E33G — digital nomad visa (since October 2025).</strong> Up to 1 year, requires verified income of $60K+/year from outside Indonesia. Doesn&apos;t allow working for local companies but legalises remote work. Ideal for freelancers and remote workers.</p>
              <p><strong>KITAS Investor.</strong> 1-2 years with extensions, linked to a PT PMA with at least $40K invested. Allows residence, opening a local bank account, buying a car, getting resident health insurance. Most popular format for entrepreneurs.</p>
              <p><strong>Second Home Visa.</strong> 5-10 years, requires a $130K deposit in an Indonesian bank (gradually withdrawable). For financially independent applicants, retirees, well-off families.</p>
              <p><strong>Golden Visa.</strong> 5-10 years, $350K (individual) or $25M (company) investment. Top-tier format — maximum rights and minimal renewal checks.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Resident taxes for foreigners</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>After 183 days in Indonesia within 12 months, you&apos;re a tax resident. Since 2025 Indonesia applies worldwide taxation: PIT is paid on all global income, not just local.</p>
              <p>Progressive bracket: 5% up to IDR 60M (~$4K), 15% up to 250M (~$16K), 25% up to 500M (~$32K), 30% up to 5B (~$320K), 35% above. Tax year = calendar year, return due by March 31.</p>
              <p>Double taxation treaties reduce the load. Indonesia has DTAs with the US, UK, Singapore, Australia, all EU members, Russia, Kazakhstan, Belarus, Ukraine — about 70 countries. Tax paid abroad credits against the Indonesian liability.</p>
              <p>For income structuring through a PT PMA: 22% corporate tax + 10% dividend withholding when paid to a non-resident (DTA-adjusted). Often the effective rate is lower than personal PIT on large incomes.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">International schools</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Preschool (3-5 years):</strong> Sunrise Preschool, Sanggar Anak Tangguh, Australian Independent (early years) — $5-10K/year. Strong Montessori, Reggio Emilia, Waldorf programmes.</p>
              <p><strong>Primary and middle school (standard tier):</strong> Sunrise School (Bumin Sanur), Australian Independent School (Sanur), Cita Hati (Denpasar), Bali Island School (Sanur) — $7-15K/year. Cambridge and International Baccalaureate curricula, English plus Spanish/Mandarin/Indonesian.</p>
              <p><strong>Premium:</strong> Green School Bali ($20-28K/year) — internationally famous eco-friendly bamboo school. Australian International School (Sanur, premium tier $18-25K) — Cambridge IGCSE / A-level.</p>
              <p>Large international community (5000+ expat families) — active parent networks, weekend clubs, language exchanges. Full 1-12 grade coverage available.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Healthcare</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>International-grade clinics:</strong> BIMC Kuta (Cleveland Clinic affiliate), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu Hospital. Most doctors speak English, several have international certifications (US Board, AHPRA, GMC).</p>
              <p><strong>Out-of-pocket pricing:</strong> specialist consultation $40-80, full blood panel $25-40, CT/MRI $200-400, moderate emergency surgery $5-15K, natural birth $2-4K, C-section $4-7K.</p>
              <p><strong>Insurance is mandatory:</strong> Allianz Worldwide Care, Cigna Global, Bupa Global, Aetna International. Basic plan for an adult 30-40 — $1500-2500/year, premium with Singapore hospitalisation — $3500-6000/year.</p>
              <p>Serious oncology, cardiac surgery, neurosurgery — typically evacuated to Singapore (Mount Elizabeth, Gleneagles) or Malaysia (Sunway Medical). Most insurance plans cover evacuation.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Real cost of living</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Category</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Minimum</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Comfortable</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Premium</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-[var(--color-border)]">
                  <tr><td className="font-semibold">Rent (3BR)</td><td>$1000-1500</td><td>$2500-3500</td><td>$5000-9000</td></tr>
                  <tr><td className="font-semibold">Transport</td><td>$150 (scooter)</td><td>$500 (car+scooter)</td><td>$1500 (driver)</td></tr>
                  <tr><td className="font-semibold">Food</td><td>$400</td><td>$1200</td><td>$2500</td></tr>
                  <tr><td className="font-semibold">Helper</td><td>—</td><td>$200 (3 days/wk)</td><td>$600 (full-time)</td></tr>
                  <tr><td className="font-semibold">School (2 kids)</td><td>—</td><td>$1500</td><td>$3500</td></tr>
                  <tr><td className="font-semibold">Family insurance</td><td>$300</td><td>$600</td><td>$1200</td></tr>
                  <tr><td className="font-semibold">Other</td><td>$200</td><td>$700</td><td>$1500</td></tr>
                  <tr className="font-semibold"><td>TOTAL /month</td><td>$2050-2550</td><td>$7200-8200</td><td>$15800-19800</td></tr>
                </tbody>
              </table>
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

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Next steps</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/fr/investissement-immobilier-bali" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Bali property investment</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Yields, leasehold, taxes, ROI — full investor guide.</p>
              </Link>
              <Link href="/fr/villas/umalas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villas in Umalas — residential district</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Quiet area for families with kids, schools and infrastructure nearby.</p>
              </Link>
              <Link href="/fr/villas/sanur" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villas in Sanur — calm coast</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Family audience, beachfront promenade, low risk.</p>
              </Link>
              <Link href="/fr/contact" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Contact</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Telegram, email, partner contacts.</p>
              </Link>
            </div>
          </section>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </PageContainer>
      <Footer lang="fr" />
    </>
  )
}
