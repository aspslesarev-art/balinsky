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
const UPDATED = '15. Mai 2026'

export const metadata: Metadata = {
  title: 'Immobilieninvestment auf Bali 2026 — Reale Renditen, Leasehold, Steuern | Balinsky',
  description: 'Vollständiger Ratgeber zum Immobilieninvestment auf Bali für Ausländer: reale Nettorenditen von 8-15 %, Leasehold- vs. PT-PMA-Strukturen, Steuern, ROI-Berechnungen und Fallstudien in Canggu, Bukit und Ubud.',
  alternates: {
    canonical: '/de/bali-immobilien-investment',
    languages: {
      ru: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
      en: `${SITE_URL}/en/bali-property-investment`,
      de: `${SITE_URL}/de/bali-immobilien-investment`,
      'x-default': `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
    },
  },
  openGraph: {
    title: 'Immobilieninvestment auf Bali 2026 — Vollständiger Ratgeber für Ausländer',
    description: '8-15 % Nettorendite, Leasehold vs. PT PMA, Steuern, ROI nach Bezirk. Reale Zahlen aus Booking-Analytik und Käufer-Fallstudien.',
    type: 'article',
    url: '/de/bali-immobilien-investment',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Immobilieninvestment auf Bali 2026',
    description: 'Reale Renditen, Leasehold, Steuern, ROI nach Bezirk. Geprüfte Daten.',
    images: ['/balina.jpg'],
  },
}

const FAQ = [
  { q: 'Wie hoch ist die realistische Mietrendite einer Bali-Villa 2026?',
    a: 'Basierend auf Live-Booking-Daten über estatemarket.io: 8-12 % Nettojahresrendite in Canggu und Bukit bei 70-80 % Auslastung mit professionellem Management. Villen im Premiumsegment (Neubauten mit Meerblick, ab 4 Schlafzimmern) erreichen bis zu 15 %. Ubud und Sanur liefern 6-9 % aufgrund niedrigerer Durchschnittspreise. Dies sind Nettozahlen, nach Verwaltungsgebühren (15-20 % des Umsatzes), Nebenkosten, Abschreibung, Steuern und Leerstand.' },
  { q: 'Leasehold oder PT PMA — welche Struktur sollte ein ausländischer Investor wählen?',
    a: 'Leasehold (langfristige Grundstückspacht, 25-80 Jahre) eignet sich für 1-2 einzelne Immobilienkäufe. Günstiger, schneller (1-2 Monate), keine Gesellschaftsstruktur nötig. Eine PT PMA (indonesisches Unternehmen mit ausländischen Anteilseignern) ist sinnvoll für ein Portfolio von 3+ Einheiten oder Gewerbeimmobilien. Sie ermöglicht Freehold-Eigentum, erfordert aber 25.000 $ eingezahltes Kapital, jährliche Berichterstattung und Körperschaftsteuer.' },
  { q: 'Welche Steuern zahlt ein Ausländer beim Kauf und Besitz einer Immobilie auf Bali?',
    a: 'Beim Kauf: 5 % Erwerbsteuer (BPHTB) + 1-2 % Notar + gegebenenfalls 3-5 % Maklerprovision. Beim Besitz: PBB (Grundsteuer) 0,1-0,3 % des Katasterwerts jährlich. Auf Mieteinnahmen: 20 % Einkommensteuer für Ausländer (über eine PT PMA reduzierbar). Beim Verkauf: 2,5 % Einkommensteuer auf den Verkaufspreis.' },
  { q: 'Nach wie vielen Jahren amortisiert sich eine Bali-Villa?',
    a: 'Bei 10 % Jahresrendite — 10 Jahre. Bei 12 % — 8,3 Jahre. In der Praxis: 7-10 Jahre in Canggu/Bukit mit aktivem Management; 12-15 Jahre in ruhigeren Bezirken. Vorsicht bei Leaseholds mit weniger als 30 Restlaufjahren beim Kauf — sie durchlaufen oft keinen vollständigen Amortisationszyklus samt gewinnbringendem Weiterverkauf.' },
  { q: 'Was sind PBG und SLF und warum sind sie entscheidend?',
    a: 'PBG (Persetujuan Bangunan Gedung) ist die Baugenehmigung, die vor dem Bau erteilt wird. SLF (Sertifikat Laik Fungsi) ist die Nutzungstauglichkeitsbescheinigung, die nach Fertigstellung erteilt wird. Ohne SLF kann die Einheit nicht legal vermietet werden — Ihr Investitionsmodell funktioniert offiziell nicht. Jede Immobilie im Balinsky-Katalog wird vor der Veröffentlichung auf diese Dokumente geprüft — das macht uns zu einer redaktionellen Auswahl, nicht zu einem Aggregator.' },
  { q: 'Kann ich über ein Immobilieninvestment eine indonesische Aufenthaltserlaubnis erhalten?',
    a: 'Es gibt kein direktes „Immobilie gegen Aufenthalt“-Programm. Es gibt das KITAS Investor Visa (ab 40.000 $ Investition in eine PT PMA), das Second Home Visa (ab 130.000 $ Einlage bei einer indonesischen Bank) und das Golden Visa (ab 350.000 $ Einzelinvestition, 25 Mio. $ für Unternehmen). Der bloße Kauf einer Villa gewährt keinen Aufenthalt — Sie benötigen entweder eine Gesellschafts- oder eine Einlagenstruktur.' },
]

const REGIONS = [
  { name: 'Canggu', slug: 'canggu', yieldRange: '10-13%', priceFrom: '$180K', niche: 'Trendbezirk, Events, Networking, Tagesvermietung' },
  { name: 'Bukit (Uluwatu/Pandawa/Ungasan)', slug: 'uluwatu', yieldRange: '10-15%', priceFrom: '$130K', niche: 'Premium-Meerblick, Surf-Community, hohe Durchschnittspreise' },
  { name: 'Ubud', slug: 'ubud', yieldRange: '6-9%', priceFrom: '$120K', niche: 'Wellness, Yoga-Tourismus, längere Aufenthalte' },
  { name: 'Sanur', slug: 'sanur', yieldRange: '5-8%', priceFrom: '$150K', niche: 'Familiensegment, geringes Risiko, stabile Nachfrage' },
  { name: 'Nusa Dua', slug: 'nusa-dua', yieldRange: '7-10%', priceFrom: '$200K', niche: 'Premiumhotels in der Nähe, Geschäftsreisen' },
  { name: 'Pererenan', slug: 'pererenan', yieldRange: '9-12%', priceFrom: '$160K', niche: 'ruhiger, an Canggu angrenzend, wachsendes Trendgebiet' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${SITE_URL}/de` },
      { '@type': 'ListItem', position: 2, name: 'Immobilieninvestment auf Bali', item: `${SITE_URL}/de/bali-immobilien-investment` },
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
          { label: 'Startseite', href: '/de' },
          { label: 'Immobilieninvestment auf Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Immobilieninvestment auf Bali — Ratgeber 2026
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Reale Nettojahresrenditen von 8-15 %, ROI-Aufschlüsselung über 6 Bezirke, rechtliche Strukturen (Leasehold und
              PT PMA), Steuern für ausländische Eigentümer und eine redaktionelle Auswahl von Immobilien mit geprüften
              Genehmigungen.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Aktualisiert: {UPDATED}</p>
          </header>

          <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: TrendingUp, n: '8–15%', label: 'Nettojahresrendite' },
              { Icon: Building2, n: '828+', label: 'Einheiten im Katalog' },
              { Icon: ShieldCheck, n: '100%', label: 'PBG + SLF geprüft' },
              { Icon: BarChart3, n: '6', label: 'Investitionsbezirke' },
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
              Warum Bali 2026 der Markt Nr. 1 für ausländische Investoren ist
            </h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>
                Bali ist der einzige Tourismusmarkt in Südostasien, auf dem ein Ausländer trotz des indonesischen
                Freehold-Verbots für Ausländer legal Immobilien halten kann. Über Leasehold- und PT-PMA-Strukturen werden
                Transaktionen schnell und sauber abgeschlossen, und die Steuersätze gehören zu den niedrigsten der Region.
              </p>
              <p>
                Parallel behauptet die Insel ihre Position als regionales Tourismus-Schwergewicht: 6-7 Millionen
                internationale Besucher jährlich, 70-85 % Auslastung in Hotels und Mietobjekten in Canggu und Bukit, ein
                Durchschnittspreis pro Nacht (ADR), der seit 2023 jährlich um 8-12 % steigt. Laut <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a> —
                der öffentlichen Booking-Analytik, die wir in jeder Immobilienkarte anzeigen — sind reale Renditedaten auf
                Nachbarschaftsebene buchstäblich Straße für Straße im Umkreis von 1 km verfügbar.
              </p>
              <p>
                Das ist die seltene Kombination: <strong>hohe Touristennachfrage + legale, ausländerfreundliche Strukturen + niedrige Einstiegskosten</strong>
                (120.000-200.000 $ für eine Einsteigereinheit). Kein anderer südostasiatischer Markt vereint alle drei — Phuket und Ho-Chi-Minh-Stadt
                sind teurer und bei Transaktionen komplizierter, Samui und Langkawi haben eine schwächere Nachfrage.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Renditen nach Bezirk — reale Zahlen 2026
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-6">
              Diese Spannen mitteln vergleichbare Booking-Nachbarn über die letzten 12 Monate, abzüglich Verwaltungsgebühren,
              Abschreibung und Steuern. Streuung als 5. und 95. Perzentil dargestellt.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Bezirk</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Rendite</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Ab</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] hidden md:table-cell">Charakter</th>
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
                        <Link href={`/de/villen`} className="text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                          ansehen <ChevronRight size={14} />
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
              Rechtliche Strukturen — Leasehold vs. PT PMA
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">Leasehold</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Langfristige Grundstückspacht von einem lokalen Eigentümer — 25-80 Jahre, oft verlängerbar.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Minimaler Papierkram und wenige Formalitäten</li>
                  <li>Abschluss in 1-2 Monaten bei einem PPAT-Notar</li>
                  <li>Passend für 1-2 einzelne Käufe</li>
                  <li>Pro Deal 5.000-15.000 $ günstiger als PT PMA</li>
                  <li className="text-[var(--color-text-muted)]">Sie besitzen das Land nicht — nur das Nutzungsrecht</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">PT PMA</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Indonesisches Unternehmen mit ausländischen Anteilseignern — kann Freehold-Land halten.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Freehold-Eigentum</li>
                  <li>Passend für ein Portfolio ab 3 Einheiten</li>
                  <li>Ermöglicht legalen Vermietungsbetrieb</li>
                  <li>25.000 $ eingezahltes Kapital + jährliche Berichterstattung</li>
                  <li className="text-[var(--color-text-muted)]">22 % Körperschaftsteuer</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              Vollständiger Transaktionsleitfaden auf der Seite <Link href="/de/kaufen" className="text-[var(--color-primary)] no-underline hover:underline">„Wie man Immobilien auf Bali kauft“</Link>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              ROI-Berechnung — typischer Fall
            </h2>
            <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-[var(--color-primary)]" />
                <strong>2-Zimmer-Villa in Canggu, 250.000 $, 30-jähriger Leasehold</strong>
              </div>
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                <li>Kaufpreis: 250.000 $</li>
                <li>Transaktionskosten (Notar, BPHTB-Steuer, Due Diligence): ~15.000 $</li>
                <li>Durchschnittspreis: 200 $/Nacht × 75 % Auslastung × 365 Tage = 54.750 $/Jahr</li>
                <li>Ausgaben (Management 18 %, Nebenkosten, Möbelabschreibung, 20 % Steuer): ~23.500 $/Jahr</li>
                <li>Netto-Cashflow: ~31.250 $/Jahr → 12,5 % Jahresrendite auf die Investition von 250.000 $</li>
                <li>Amortisation: ~8 Jahre bis zum Break-even, 22 nutzbare Vermietungsjahre verbleiben auf der Pacht</li>
              </ul>
              <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
                Ein ähnlicher Rechner läuft automatisch auf jeder Villenseite in unserem Katalog, gespeist mit realen
                Nachbarschaftsdaten von <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a>.
              </p>
            </div>
          </section>

          <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Risiken, über die Verkäufer nicht sprechen</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>Leasehold unter 30 Jahren.</strong> Sie holen die Investition nicht wieder herein und verkaufen trotzdem mit Gewinn weiter. Bestehen Sie beim Kauf auf mindestens 35 Restjahren.</li>
                  <li><strong>Immobilie ohne SLF.</strong> Eine legale Vermietung ist unmöglich — Ihr Renditemodell existiert auf dem Papier nicht.</li>
                  <li><strong>Bauträger ohne PBG.</strong> Der Bau kann von den Behörden gestoppt werden und Ihre Anzahlung wird nicht erstattet.</li>
                  <li><strong>Land in landwirtschaftlicher Zone.</strong> Einige Grundstücke in Canggu/Pererenan werden umgewidmet — prüfen Sie den RDTR-Plan.</li>
                  <li><strong>Reale Auslastung unter dem Versprochenen.</strong> Vom Bauträger garantierte Renditen sind in der Regel um 30-50 % überhöht. Gleichen Sie sie mit Booking-Nachbarschaftsdaten ab.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Wie wir Katalogimmobilien prüfen
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-4">
              Jede Immobilie bei Balinsky durchläuft vor der Veröffentlichung eine redaktionelle Qualitätsprüfung. Dies ist
              kein Allerwelts-Aggregator — nur Projekte, bei denen Genehmigungen (PBG, SLF), Grundstücksstruktur (Zonierung,
              RDTR) und Bauträger (PT-Registrierung) von Hand geprüft wurden.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <FileCheck2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Dokumente</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PBG, SLF, IMB, AJB / notarielle Urkunde — abgeglichen mit den Registern des ATR/BPN-Ministeriums.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Building2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Bauträger</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PT-Registrierung, Portfolio abgeschlossener Projekte, Ruf in der lokalen Maklergemeinschaft.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <MapPin size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Lage</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Besichtigung vor Ort, Foto und Video vom Grundstück, Infrastrukturprüfung im Umkreis von 500 m.</p>
              </div>
            </div>
            <div className="mt-6 text-[14px]">
              Mehr dazu auf <Link href="/de/ueber-uns" className="text-[var(--color-primary)] no-underline hover:underline">„Über Balinsky“</Link>.
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Nächste Schritte
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/de/villen" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villenkatalog</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Jede Villa mit Fotos, Preisen, Genehmigungen und ROI-Berechnung.</p>
              </Link>
              <Link href="/de/apartments" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Apartmentkatalog</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Einheiten in verwalteten Anlagen — die niedrigste Einstiegsschwelle.</p>
              </Link>
              <Link href="/de/wohnanlagen" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Wohnanlagen</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Off-Plan- und fertige Anlagen mit Management, Renderings und Fertigstellungsterminen.</p>
              </Link>
              <Link href="/de/kaufen" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Wie man kauft — Schritt für Schritt</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Sieben Schritte der Transaktion, Eigentumsstrukturen, reale Kosten und Fallstricke.</p>
              </Link>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Häufig gestellte Fragen
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
      <Footer lang="de" />
    </>
  )
}
