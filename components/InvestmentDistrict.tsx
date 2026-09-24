// «Investing in <district>» pages, shared by all ten locales.
//
// Replaces ten copies that printed «net yield 10-15%», «occupancy 75-85%»,
// «payback 7-12 years» and fell back to «8-15%» when a district had no
// figure. The district figures now come from the market snapshot
// (lib/district-market.json via lib/districts) and the island-wide numbers
// from lib/investment-guide/data.ts; risks and sources are the pillar's.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, ChevronRight, AlertTriangle, MapPin, Calculator } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { GUIDE_COPY } from '@/components/InvestmentGuide'
import { getDistrictCopy, districtMarket, type DistrictCopy } from '@/lib/districts'
import { hreflangMap, SITE_ORIGIN } from '@/lib/hreflang'
import { switchLangPath, type Lang } from '@/lib/i18n'
import { localizeHubPath } from '@/lib/hub-routes'
import { SLUG_TO_DISTRICT } from '@/lib/seo-routes'
import { SRC } from '@/lib/investment-guide/data'

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
// Revenue estimates to the nearest $100 — more digits would be false precision.
const usd100 = (n: number) => usd(Math.round(n / 100) * 100)

export function investmentDistrictPath(slug: string, lang: Lang): string {
  return lang === 'ru' ? `/ru/investicii/${slug}` : switchLangPath(`/en/bali-property-investment/${slug}`, lang)
}

export function investmentDistrictMetadata(slug: string, lang: Lang): Metadata {
  const copy = getDistrictCopy(slug, lang)
  if (!copy) return { robots: { index: false, follow: false } }
  const d = GUIDE_COPY[lang].district
  const path = investmentDistrictPath(slug, lang)
  return {
    title: d.metaTitle(copy.name),
    description: d.metaDescription(copy.name),
    alternates: { canonical: path, languages: hreflangMap(`/ru/investicii/${slug}`) },
    openGraph: { title: d.h1(copy.name), description: d.metaDescription(copy.name), type: 'article', url: path },
    twitter: { card: 'summary_large_image' },
  }
}

const A = 'text-[var(--color-primary-pressed)] underline underline-offset-2 hover:no-underline'

export function InvestmentDistrict({ slug, lang, copy }: { slug: string; lang: Lang; copy: DistrictCopy }) {
  const g = GUIDE_COPY[lang]
  const d = g.district
  const m = districtMarket(slug)
  const home = switchLangPath('/ru', lang)
  const pillar = switchLangPath('/ru/investicii-v-nedvizhimost-bali', lang)
  const methodHref = lang === 'ru' ? SRC.yieldRu : SRC.yieldEn
  const latinName = SLUG_TO_DISTRICT[slug] ?? copy.name
  const rate = m?.nightly2br ?? null
  const gross = rate ? rate * 0.65 * 365 : null

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: g.crumbHome, item: `${SITE_ORIGIN}${home}` },
      { '@type': 'ListItem', position: 2, name: g.crumb, item: `${SITE_ORIGIN}${pillar}` },
      { '@type': 'ListItem', position: 3, name: copy.name, item: `${SITE_ORIGIN}${investmentDistrictPath(slug, lang)}` },
    ],
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: g.crumbHome, href: home },
          { label: g.crumb, href: pillar },
          { label: copy.name },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">{d.h1(copy.name)}</h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed max-w-[68ch]">{copy.hero}</p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">{g.updated}</p>
          </header>

          {copy.highlights.length > 0 && (
            <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
              {copy.highlights.map(h => (
                <div key={h.label} className="rounded-xl border border-[var(--color-border)] p-4 bg-white">
                  <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{h.label}</div>
                  <div className="text-[20px] font-semibold text-[#111827]">{h.value}</div>
                </div>
              ))}
            </section>
          )}

          {copy.paragraphs.length > 0 && (
            <section className="mb-10 space-y-4 text-[16px] leading-[1.7] text-[#1f2937] max-w-[68ch]">
              {copy.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </section>
          )}

          <section className="mb-10 rounded-2xl border border-[var(--color-border)] p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={20} className="text-[var(--color-primary)]" />
              <strong>{d.caseTitle(copy.name)}</strong>
            </div>
            {rate && gross ? (
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                <li>{d.rate(usd(rate), String(m?.nightly2brN ?? ''))}</li>
                <li>{d.revenue(usd100(gross))}</li>
                <li>{d.net(usd100(gross * 0.49))}</li>
                {m?.medianVillaPrice && m.villasForSale >= 10 && (
                  <li>{d.price(usd(m.medianVillaPrice), String(m.villasForSale))}</li>
                )}
              </ul>
            ) : (
              <p className="text-[14px] text-[#1f2937]">{d.noRentals}</p>
            )}
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              {d.island}{' '}
              <Link href={methodHref} className={A}>{g.yields.methodLink}</Link>
              {' · '}
              <a href={SRC.estatemarket} target="_blank" rel="nofollow noopener noreferrer" className={A}>estatemarket.io</a>
            </p>
          </section>

          <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">{d.risksH3}</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  {g.risks.items.map(r => <li key={r.t}><strong>{r.t}</strong> {r.d}</li>)}
                </ul>
              </div>
            </div>
          </section>

          {copy.bestFor.length > 0 && (
            <section className="mb-10">
              <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">{d.bestFor}</h2>
              <div className="flex flex-wrap gap-2">
                {copy.bestFor.map(tag => (
                  <span key={tag} className="inline-block text-[14px] bg-white border border-[var(--color-border)] rounded-full px-4 py-2">{tag}</span>
                ))}
              </div>
            </section>
          )}

          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">{d.next}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                [localizeHubPath(`/ru/villy/${slug}`, lang), d.villas(copy.name)],
                [localizeHubPath(`/ru/apartamenty/${slug}`, lang), d.apartments(copy.name)],
                [localizeHubPath(`/ru/zhilye-kompleksy/${slug}`, lang), d.complexes(copy.name)],
                [pillar, d.guide],
              ] as const).map(([href, [t, desc]], i) => (
                <Link key={href} href={href} className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                  <h3 className="text-[16px] font-semibold text-[#111827] mb-1 inline-flex items-center gap-1.5">
                    {i === 3 && <TrendingUp size={16} className="text-[var(--color-primary)]" />}{t}
                  </h3>
                  <p className="text-[13px] text-[var(--color-text-muted)]">{desc}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-10 flex items-center gap-2 text-[14px] text-[var(--color-text-muted)]">
            <MapPin size={14} />
            {d.map}{' '}
            <Link href={`${switchLangPath('/ru/villy/karta', lang)}?district=${encodeURIComponent(latinName)}`} className="text-[var(--color-primary)] no-underline hover:underline">{d.mapLink}</Link>
            <ChevronRight size={14} />
          </section>

          <section className="mb-10">
            <h2 className="text-[20px] font-semibold tracking-tight text-[#111827] mb-3">{g.sourcesH2}</h2>
            <ol className="list-decimal pl-5 space-y-1.5 text-[14px] text-[#1f2937]">
              {g.sources.slice(0, 5).map(s => (
                <li key={s.href}>
                  {s.href.startsWith('/')
                    ? <Link href={s.href} className={A}>{s.label}</Link>
                    : <a href={s.href} target="_blank" rel="noopener noreferrer" className={A}>{s.label}</a>}
                </li>
              ))}
            </ol>
          </section>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      </PageContainer>
      <Footer lang={lang} />
    </>
  )
}
