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
const UPDATED = '15. Mai 2026'

export const metadata: Metadata = {
  title: 'Leben auf Bali — Visa, Steuern, Schulen, Gesundheit 2026 | Balinsky',
  description: 'Umzugsratgeber für Bali: KITAS, Second Home Visa, Golden Visa, Steuern für ausländische Residenten, internationale Schulen, BIMC- und Siloam-Kliniken, reale Familienbudgets.',
  alternates: {
    canonical: '/de/leben-auf-bali',
    languages: {
      ru: `${SITE_URL}/ru/zhizn-na-bali`,
      en: `${SITE_URL}/en/living-in-bali`,
      de: `${SITE_URL}/de/leben-auf-bali`,
      'x-default': `${SITE_URL}/ru/zhizn-na-bali`,
    },
  },
  openGraph: {
    title: 'Leben auf Bali — Umzugsratgeber 2026',
    description: 'KITAS, Second Home Visa, Golden Visa, Steuern für Residenten, Schulen, Gesundheit, Familienbudget — von Praktikern, die seit über 5 Jahren hier leben.',
    type: 'article',
    url: '/de/leben-auf-bali',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leben auf Bali — Umzugsratgeber 2026',
    description: 'Visa, Steuern, Schulen, Gesundheit, Budget.',
    images: ['/andrei.jpg'],
  },
}

const FAQ = [
  { q: 'Welches Visum eignet sich für einen langfristigen Umzug nach Bali?',
    a: 'Grundlage: B211A (Touristenvisum, mit Verlängerungen bis zu 6 Monate) für eine Probephase. KITAS Investor (1-2 Jahre, ab 40.000 $ Investition in eine PT PMA) für Unternehmer und Investoren. KITAS Working — über einen indonesischen Arbeitgeber. Second Home Visa (5-10 Jahre, 130.000 $ Einlage bei einer lokalen Bank) für finanziell unabhängige Antragsteller. Golden Visa (5-10 Jahre, ab 350.000 $ Investition) — Spitzenklasse für vermögende Personen.' },
  { q: 'Welche Steuern zahlt ein ausländischer Bali-Resident?',
    a: 'Nach 183 Tagen in Indonesien innerhalb eines Kalenderjahres werden Sie steuerlich ansässig. Progressive Einkommensteuer: 5 % bis IDR 60 Mio. (~4.000 $), 15 % bis 250 Mio., 25 % bis 500 Mio., 30 % bis 5 Mrd., 35 % darüber. Welteinkommen, aber Anrechnung über Doppelbesteuerungsabkommen (Indonesien hat DBA mit über 70 Ländern, darunter USA, Großbritannien, Singapur, Australien, EU-Staaten).' },
  { q: 'Wie viel kostet eine internationale Schule?',
    a: 'Standardklasse: Sunrise School, Australian Independent School, Cita Hati — 7.000-15.000 $/Jahr pro Grundschulkind. Premium: Green School Bali — 20.000-28.000 $, Australian International School — 18.000-25.000 $. Vorschule (3-5 Jahre) — 5.000-10.000 $/Jahr. Budget für zwei Kinder in der Mittelstufe: 20.000-35.000 $/Jahr.' },
  { q: 'Welche medizinische Versorgung gibt es?',
    a: 'Internationaler Standard: BIMC Kuta (Partner der Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu. Facharztkonsultation 40-80 $, CT/MRT 200-400 $, Notoperation 5.000-15.000 $. Eine internationale Versicherung ist Pflicht (Allianz, Cigna, Bupa) — 1.500-3.500 $/Jahr pro Erwachsenem. Schwere Operationen und Onkologie werden meist nach Singapur oder Malaysia verlegt.' },
  { q: 'Wie hoch ist das Monatsbudget für eine vierköpfige Familie?',
    a: 'Komfortabel (zwei Kinder in internationaler Schule, 3-Zimmer-Haus mit Garten und Pool in Umalas, Haushaltshilfe 4 Tage/Woche, ein Auto): 5.500-7.500 $/Monat = 66.000-90.000 $/Jahr. Premium (Green School, Villa in Berawa, Vollzeit-Fahrer und -Hilfe, zwei Autos): 9.000-13.000 $/Monat = 108.000-156.000 $/Jahr. Minimum (ohne Schule, bescheidene 2-Zimmer-Villa in Sanur): 2.200-3.000 $/Monat.' },
  { q: 'Kann ich von Bali aus remote arbeiten — Internet und Infrastruktur?',
    a: 'Ja. Die Geschäftsinfrastruktur ist solide: Glasfaser 200-1000 Mbit/s in Canggu, Berawa, Umalas, Sanur und den meisten Bukit-Anlagen. Coworking rund um die Uhr (Outpost, Tropical Nomad, Dojo, Soul & Surf). Der Strom ist stabil, Ausfälle sind selten. KITAS Investor oder B211A (mit dem neuen E33G-Digital-Nomad-Visum seit Oktober 2025) decken Remote-Arbeit rechtlich ab.' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${SITE_URL}/de` },
      { '@type': 'ListItem', position: 2, name: 'Leben auf Bali', item: `${SITE_URL}/de/leben-auf-bali` },
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
    { Icon: Plane, title: 'Visa & Aufenthalt', body: 'KITAS Investor ab 40.000 $, Second Home Visa ab 130.000 $ Einlage, Golden Visa ab 350.000 $ Investition. Touristen-B211A für die 6-monatige Probephase.' },
    { Icon: FileCheck2, title: 'Steuern für Residenten', body: 'Steuerlich ansässig nach 183 Tagen im Jahr. Progressive Sätze von 5-35 %. DBA-Anrechnung mit über 70 Ländern — die meisten westlichen und GUS-Märkte abgedeckt.' },
    { Icon: GraduationCap, title: 'Schulen', body: 'Sunrise / AIS / Cita Hati: 7.000-15.000 $/Jahr. Premium — Green School (20.000-28.000 $) und AIS Premium. Starke internationale Community.' },
    { Icon: Stethoscope, title: 'Gesundheit', body: 'BIMC, Siloam, Kasih Ibu — Kliniken auf internationalem Niveau. Versicherung Pflicht (1.500-3.500 $/Jahr). Große Operationen werden nach Singapur verlegt.' },
    { Icon: Wallet, title: 'Familienbudget', body: 'Vierköpfige Familie: komfortabel 66.000-90.000 $/Jahr, Premium 108.000-156.000 $/Jahr. Grundminimum ohne Schulen — ab 2.200 $/Monat.' },
    { Icon: Wifi, title: 'Remote-Arbeit', body: 'Glasfaser 200-1000 Mbit/s in allen Investitionsbezirken. Coworking bei Outpost / Tropical Nomad / Dojo. KITAS Investor oder das neue E33G-Digital-Nomad-Visum decken Remote-Arbeit rechtlich ab.' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Startseite', href: '/de' },
          { label: 'Leben auf Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Leben auf Bali — Umzugsratgeber
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Aufenthaltstitel über KITAS, Second Home und Golden Visa, Steuern für ausländische Residenten, reale
              Familienbudgets, internationale Schulen, Gesundheitsversorgung und Infrastruktur für Remote-Arbeit — gesammelt
              von Praktikern, die seit über 5 Jahren auf der Insel leben.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Aktualisiert: {UPDATED}</p>
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
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Visa — was passt zu welcher Situation</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>B211A — Touristenvisum.</strong> 60 Tage mit Verlängerungen bis zu 6 Monate. Passend für die Probephase, bevor Sie sich zum Umzug entscheiden. Kosten 50-100 $ + Agenturgebühr 50-150 $.</p>
              <p><strong>E33G — Digital-Nomad-Visum (seit Oktober 2025).</strong> Bis zu 1 Jahr, erfordert ein nachgewiesenes Einkommen von über 60.000 $/Jahr aus dem Ausland. Erlaubt keine Arbeit für lokale Unternehmen, legalisiert aber Remote-Arbeit. Ideal für Freelancer und Remote-Mitarbeiter.</p>
              <p><strong>KITAS Investor.</strong> 1-2 Jahre mit Verlängerungen, gebunden an eine PT PMA mit einer Investition von mindestens 40.000 $. Ermöglicht Aufenthalt, Eröffnung eines lokalen Bankkontos, Autokauf und eine Krankenversicherung für Residenten. Das beliebteste Format für Unternehmer.</p>
              <p><strong>Second Home Visa.</strong> 5-10 Jahre, erfordert eine Einlage von 130.000 $ bei einer indonesischen Bank (schrittweise abhebbar). Für finanziell unabhängige Antragsteller, Rentner und wohlhabende Familien.</p>
              <p><strong>Golden Visa.</strong> 5-10 Jahre, Investition von 350.000 $ (Einzelperson) oder 25 Mio. $ (Unternehmen). Spitzenformat — maximale Rechte und minimale Verlängerungsprüfungen.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Steuern für ausländische Residenten</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>Nach 183 Tagen in Indonesien innerhalb von 12 Monaten sind Sie steuerlich ansässig. Seit 2025 wendet Indonesien die Welteinkommensbesteuerung an: Einkommensteuer wird auf das gesamte weltweite Einkommen gezahlt, nicht nur auf das lokale.</p>
              <p>Progressive Sätze: 5 % bis IDR 60 Mio. (~4.000 $), 15 % bis 250 Mio. (~16.000 $), 25 % bis 500 Mio. (~32.000 $), 30 % bis 5 Mrd. (~320.000 $), 35 % darüber. Steuerjahr = Kalenderjahr, Erklärung bis zum 31. März fällig.</p>
              <p>Doppelbesteuerungsabkommen senken die Last. Indonesien hat DBA mit den USA, Großbritannien, Singapur, Australien, allen EU-Staaten, Russland, Kasachstan, Belarus und der Ukraine — rund 70 Länder. Im Ausland gezahlte Steuern werden auf die indonesische Schuld angerechnet.</p>
              <p>Bei Einkommensstrukturierung über eine PT PMA: 22 % Körperschaftsteuer + 10 % Quellensteuer auf Dividenden bei Zahlung an Nichtansässige (DBA-angepasst). Oft ist der effektive Satz niedriger als die persönliche Einkommensteuer bei hohen Einkommen.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Internationale Schulen</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Vorschule (3-5 Jahre):</strong> Sunrise Preschool, Sanggar Anak Tangguh, Australian Independent (Frühjahre) — 5.000-10.000 $/Jahr. Starke Montessori-, Reggio-Emilia- und Waldorf-Programme.</p>
              <p><strong>Grund- und Mittelstufe (Standardklasse):</strong> Sunrise School (Bumin Sanur), Australian Independent School (Sanur), Cita Hati (Denpasar), Bali Island School (Sanur) — 7.000-15.000 $/Jahr. Cambridge- und International-Baccalaureate-Lehrpläne, Englisch plus Spanisch/Mandarin/Indonesisch.</p>
              <p><strong>Premium:</strong> Green School Bali (20.000-28.000 $/Jahr) — international bekannte, umweltfreundliche Bambusschule. Australian International School (Sanur, Premiumklasse 18.000-25.000 $) — Cambridge IGCSE / A-Level.</p>
              <p>Große internationale Community (über 5.000 Expat-Familien) — aktive Elternnetzwerke, Wochenendclubs, Sprach-Tandems. Vollständige Abdeckung der Klassen 1-12 verfügbar.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Gesundheitsversorgung</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Kliniken auf internationalem Niveau:</strong> BIMC Kuta (Partner der Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu Hospital. Die meisten Ärzte sprechen Englisch, mehrere haben internationale Zertifizierungen (US Board, AHPRA, GMC).</p>
              <p><strong>Selbstzahler-Preise:</strong> Facharztkonsultation 40-80 $, vollständiges Blutbild 25-40 $, CT/MRT 200-400 $, moderate Notoperation 5.000-15.000 $, natürliche Geburt 2.000-4.000 $, Kaiserschnitt 4.000-7.000 $.</p>
              <p><strong>Versicherung ist Pflicht:</strong> Allianz Worldwide Care, Cigna Global, Bupa Global, Aetna International. Basistarif für einen Erwachsenen von 30-40 Jahren — 1.500-2.500 $/Jahr, Premium mit Krankenhausaufenthalt in Singapur — 3.500-6.000 $/Jahr.</p>
              <p>Schwere Onkologie, Herz- und Neurochirurgie — werden in der Regel nach Singapur (Mount Elizabeth, Gleneagles) oder Malaysia (Sunway Medical) verlegt. Die meisten Versicherungen decken die Verlegung ab.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Reale Lebenshaltungskosten</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Kategorie</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Minimum</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Komfortabel</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Premium</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-[var(--color-border)]">
                  <tr><td className="font-semibold">Miete (3 Zimmer)</td><td>$1000-1500</td><td>$2500-3500</td><td>$5000-9000</td></tr>
                  <tr><td className="font-semibold">Transport</td><td>$150 (Roller)</td><td>$500 (Auto+Roller)</td><td>$1500 (Fahrer)</td></tr>
                  <tr><td className="font-semibold">Essen</td><td>$400</td><td>$1200</td><td>$2500</td></tr>
                  <tr><td className="font-semibold">Haushaltshilfe</td><td>—</td><td>$200 (3 Tage/Woche)</td><td>$600 (Vollzeit)</td></tr>
                  <tr><td className="font-semibold">Schule (2 Kinder)</td><td>—</td><td>$1500</td><td>$3500</td></tr>
                  <tr><td className="font-semibold">Familienversicherung</td><td>$300</td><td>$600</td><td>$1200</td></tr>
                  <tr><td className="font-semibold">Sonstiges</td><td>$200</td><td>$700</td><td>$1500</td></tr>
                  <tr className="font-semibold"><td>GESAMT /Monat</td><td>$2050-2550</td><td>$7200-8200</td><td>$15800-19800</td></tr>
                </tbody>
              </table>
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

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Nächste Schritte</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/de/bali-immobilien-investment" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Immobilieninvestment auf Bali</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Renditen, Leasehold, Steuern, ROI — der vollständige Investorenratgeber.</p>
              </Link>
              <Link href="/de/villen/umalas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villen in Umalas — Wohnviertel</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Ruhige Gegend für Familien mit Kindern, Schulen und Infrastruktur in der Nähe.</p>
              </Link>
              <Link href="/de/villen/sanur" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villen in Sanur — ruhige Küste</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Familienpublikum, Strandpromenade, geringes Risiko.</p>
              </Link>
              <Link href="/de/contact" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Kontakt</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Telegram, E-Mail, Partnerkontakte.</p>
              </Link>
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
