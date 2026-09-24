// «Bali property investment» pillar page, shared by all ten locales.
//
// Replaces ten hand-translated copies that promised «8–15% net», «70–85%
// occupancy» and «100% PBG + SLF verified» — none of which the site's own
// data supports. Figures now come from lib/investment-guide/data.ts
// (Balinsky catalogue + rental database, September 2026) and cited primary
// sources; the copy per locale lives in lib/investment-guide/<lang>.ts.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, Building2, FileCheck2, Calculator, ShieldCheck, BarChart3, ChevronRight, AlertTriangle, MapPin } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { hreflangMap, SITE_ORIGIN } from '@/lib/hreflang'
import { switchLangPath, type Lang } from '@/lib/i18n'
import { localizeHubPath } from '@/lib/hub-routes'
import { YIELD_ROWS, GUIDE_STATS, SRC } from '@/lib/investment-guide/data'
import type { InvestmentGuideCopy } from '@/lib/investment-guide/types'
import { en } from '@/lib/investment-guide/en'
import { ru } from '@/lib/investment-guide/ru'
import { id } from '@/lib/investment-guide/id'
import { fr } from '@/lib/investment-guide/fr'
import { de } from '@/lib/investment-guide/de'
import { zh } from '@/lib/investment-guide/zh'
import { nl } from '@/lib/investment-guide/nl'
import { pl } from '@/lib/investment-guide/pl'
import { uk } from '@/lib/investment-guide/uk'

const RU_PATH = '/ru/investicii-v-nedvizhimost-bali'

// Balinese readers get the Indonesian copy (the UI around it stays Balinese).
export const GUIDE_COPY: Record<Lang, InvestmentGuideCopy> = { en, ru, id, fr, de, zh, nl, ban: id, pl, uk }

const usd = (n: number) => '$' + n.toLocaleString('en-US')
const pct = (n: number, lang: Lang) => (lang === 'en' || lang === 'zh' ? n.toFixed(1) : n.toFixed(1).replace('.', ',')) + '%'

export function investmentGuideMetadata(lang: Lang): Metadata {
  const c = GUIDE_COPY[lang]
  const path = switchLangPath(RU_PATH, lang)
  return {
    title: c.meta.title,
    description: c.meta.description,
    alternates: { canonical: path, languages: hreflangMap(RU_PATH) },
    openGraph: {
      title: c.meta.ogTitle,
      description: c.meta.ogDescription,
      type: 'article',
      url: path,
      images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: c.meta.ogTitle, description: c.meta.ogDescription, images: ['/andrei.jpg'] },
  }
}

const H2 = 'text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4'
const P = 'text-[16px] leading-[1.7] text-[#1f2937]'
const A = 'text-[var(--color-primary-pressed)] underline underline-offset-2 hover:no-underline'

export function InvestmentGuide({ lang }: { lang: Lang }) {
  const c = GUIDE_COPY[lang]
  const L = (ruPath: string) => switchLangPath(ruPath, lang)
  const home = L('/ru')
  const methodHref = lang === 'ru' ? SRC.yieldRu : SRC.yieldEn
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map(it => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: c.crumbHome, item: `${SITE_ORIGIN}${home}` },
      { '@type': 'ListItem', position: 2, name: c.crumb, item: `${SITE_ORIGIN}${L(RU_PATH)}` },
    ],
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[{ label: c.crumbHome, href: home }, { label: c.crumb }]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">{c.h1}</h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed max-w-[68ch]">{c.intro}</p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">{c.updated}</p>
          </header>

          <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: TrendingUp, n: GUIDE_STATS.medianGross2br, label: c.stats.yield },
              { Icon: Building2, n: GUIDE_STATS.catalogue, label: c.stats.catalogue },
              { Icon: ShieldCheck, n: GUIDE_STATS.permits, label: c.stats.permits },
              { Icon: BarChart3, n: GUIDE_STATS.rentals, label: c.stats.rentals },
            ].map(({ Icon, n, label }) => (
              <div key={label} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Icon size={20} className="text-[var(--color-primary)] mb-2" />
                <div className="text-[24px] font-semibold text-[#111827]">{n}</div>
                <div className="text-[13px] text-[var(--color-text-muted)]">{label}</div>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className={H2}>{c.why.h2}</h2>
            <div className={`space-y-4 max-w-[68ch] ${P}`}>
              <p>{c.why.p1}</p>
              <p>
                {c.why.p2}{' '}
                <a href={SRC.bpsArrivals} target="_blank" rel="noopener noreferrer" className={A}>BPS</a>
                {' · '}
                <a href={SRC.estatemarket} target="_blank" rel="nofollow noopener noreferrer" className={A}>estatemarket.io</a>
              </p>
              <p>
                {c.why.p3}{' '}
                <Link href={lang === 'ru' ? SRC.zoningRu : SRC.zoningEn} className={A}>{c.why.p3Link}</Link>
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className={H2}>{c.yields.h2}</h2>
            <p className={`${P} mb-6 max-w-[68ch]`}>
              {c.yields.method}{' '}
              <Link href={methodHref} className={A}>{c.yields.methodLink}</Link>.
            </p>
            {/* Phone: one card per area — the five-column table does not fit 390px. */}
            <ul className="md:hidden space-y-3">
              {YIELD_ROWS.map(r => (
                <li key={r.key} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                  <div className="text-[15px] font-semibold text-[#111827] mb-2">{c.yields.areas[r.key]}{r.indicative ? '*' : ''}</div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[14px]">
                    <dt className="text-[var(--color-text-muted)]">{c.yields.colPrice}</dt>
                    <dd className="text-right">{usd(r.price)} <span className="text-[var(--color-text-muted)]">({r.priceN})</span></dd>
                    <dt className="text-[var(--color-text-muted)]">{c.yields.colRate}</dt>
                    <dd className="text-right">{usd(r.rate)} <span className="text-[var(--color-text-muted)]">({r.rateN.toLocaleString('en-US')})</span></dd>
                    <dt className="text-[var(--color-text-muted)]">{c.yields.colYield}</dt>
                    <dd className="text-right font-semibold text-[#111827]">{pct(r.gross, lang)} / {pct(r.net, lang)}</dd>
                  </dl>
                  {r.hub && (
                    <Link href={localizeHubPath(r.hub, lang)} className="mt-2 text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                      {c.yields.browse} <ChevronRight size={14} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)] font-medium">{c.yields.colArea}</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] font-medium">{c.yields.colPrice}</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] font-medium">{c.yields.colRate}</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] font-medium">{c.yields.colYield}</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]" />
                  </tr>
                </thead>
                <tbody>
                  {YIELD_ROWS.map(r => (
                    <tr key={r.key} className="border-b border-[var(--color-border)] align-top">
                      <td className="py-3 px-3 font-semibold text-[#111827]">{c.yields.areas[r.key]}{r.indicative ? '*' : ''}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{usd(r.price)} <span className="text-[var(--color-text-muted)]">({r.priceN})</span></td>
                      <td className="py-3 px-3 whitespace-nowrap">{usd(r.rate)} <span className="text-[var(--color-text-muted)]">({r.rateN.toLocaleString('en-US')})</span></td>
                      <td className="py-3 px-3 whitespace-nowrap font-semibold text-[#111827]">{pct(r.gross, lang)} / {pct(r.net, lang)}</td>
                      <td className="py-3 px-3 text-right">
                        {r.hub && (
                          <Link href={localizeHubPath(r.hub, lang)} className="text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                            {c.yields.browse} <ChevronRight size={14} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">{c.yields.indicative}</p>
          </section>

          <section className="mb-12">
            <h2 className={H2}>{c.legal.h2}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { t: c.legal.leaseTitle, lead: c.legal.leaseLead, items: c.legal.lease },
                { t: c.legal.pmaTitle, lead: c.legal.pmaLead, items: c.legal.pma },
              ].map(card => (
                <div key={card.t} className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                  <h3 className="text-[18px] font-semibold text-[#111827] mb-2">{card.t}</h3>
                  <p className="text-[14px] text-[var(--color-text-muted)] mb-3">{card.lead}</p>
                  <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                    {card.items.map(it => <li key={it}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              {c.legal.more} <Link href={L('/ru/kak-kupit')} className={A}>{c.legal.moreLink}</Link>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className={H2}>{c.roi.h2}</h2>
            <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-[var(--color-primary)]" />
                <strong>{c.roi.title}</strong>
              </div>
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                {c.roi.lines.map(l => <li key={l}>{l}</li>)}
              </ul>
              <p className="mt-4 text-[14px] text-[#1f2937]">{c.roi.top}</p>
              <p className="mt-3 text-[14px] text-[var(--color-text-muted)]">
                {c.roi.note} <Link href={methodHref} className={A}>{c.roi.noteLink}</Link>.
              </p>
            </div>
          </section>

          <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">{c.risks.h3}</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  {c.risks.items.map(r => <li key={r.t}><strong>{r.t}</strong> {r.d}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className={H2}>{c.check.h2}</h2>
            <p className={`${P} mb-4 max-w-[68ch]`}>{c.check.p}</p>
            <div className="grid md:grid-cols-3 gap-4">
              {c.check.cards.map((card, i) => {
                const Icon = [FileCheck2, Building2, MapPin][i] ?? FileCheck2
                return (
                  <div key={card.t} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                    <Icon size={20} className="text-[var(--color-primary)] mb-2" />
                    <h3 className="text-[14px] font-semibold text-[#111827] mb-1">{card.t}</h3>
                    <p className="text-[13px] text-[var(--color-text-muted)]">{card.d}</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 text-[14px]">
              {c.check.more} <Link href={L('/ru/o-balinsky')} className={A}>{c.check.moreLink}</Link>.
            </div>
          </section>

          <section className="mb-12">
            <h2 className={H2}>{c.next.h2}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                [L('/ru/villy'), c.next.villas],
                [L('/ru/apartamenty'), c.next.apartments],
                [L('/ru/zhilye-kompleksy'), c.next.complexes],
                [L('/ru/kak-kupit'), c.next.howTo],
              ] as const).map(([href, [t, d]]) => (
                <Link key={href} href={href} className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                  <h3 className="text-[16px] font-semibold text-[#111827] mb-1">{t}</h3>
                  <p className="text-[13px] text-[var(--color-text-muted)]">{d}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className={H2}>{c.faqH2}</h2>
            <div className="space-y-3">
              {c.faq.map(it => (
                <details key={it.q} className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-semibold text-[#111827]">
                    <span>{it.q}</span>
                    <ChevronRight size={18} className="shrink-0 transition-transform [details[open]_&]:rotate-90" />
                  </summary>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)] max-w-[68ch]">{it.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className={H2}>{c.sourcesH2}</h2>
            <ol className="list-decimal pl-5 space-y-1.5 text-[14px] text-[#1f2937]">
              {c.sources.map(s => (
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </PageContainer>
      <Footer lang={lang} />
    </>
  )
}
