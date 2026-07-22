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
const UPDATED = '15 maja 2026'

export const metadata: Metadata = {
  title: 'Życie na Bali — wizy, podatki, szkoły, opieka zdrowotna 2026 | Balinsky',
  description: 'Przewodnik po przeprowadzce na Bali: KITAS, Second Home Visa, Golden Visa, podatki dla rezydentów-obcokrajowców, szkoły międzynarodowe, szpitale BIMC i Siloam, realne budżety rodzinne.',
  alternates: {
    canonical: '/pl/zycie-na-bali',
    languages: {
      ru: `${SITE_URL}/ru/zhizn-na-bali`,
      pl: `${SITE_URL}/pl/zycie-na-bali`,
      'x-default': `${SITE_URL}/ru/zhizn-na-bali`,
    },
  },
  openGraph: {
    title: 'Życie na Bali — przewodnik po przeprowadzce 2026',
    description: 'KITAS, Second Home Visa, Golden Visa, podatki dla rezydentów, szkoły, opieka zdrowotna, budżet rodzinny — od praktyków, którzy mieszkają tu ponad 5 lat.',
    type: 'article',
    url: '/pl/zycie-na-bali',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Życie na Bali — przewodnik po przeprowadzce 2026',
    description: 'Wizy, podatki, szkoły, opieka zdrowotna, budżet.',
    images: ['/andrei.jpg'],
  },
}

const FAQ = [
  { q: 'Która wiza sprawdza się przy długoterminowej przeprowadzce na Bali?',
    a: 'Na start: B211A (turystyczna, do 6 miesięcy z przedłużeniami) na okres próbny. KITAS Investor (1-2 lata, od $40K zainwestowanych w PT PMA) dla przedsiębiorców i inwestorów. KITAS Working — przez indonezyjskiego pracodawcę. Second Home Visa (5-10 lat, depozyt $130K w lokalnym banku) dla osób niezależnych finansowo. Golden Visa (5-10 lat, inwestycja od $350K+) — najwyższy poziom dla osób zamożnych (HNW).' },
  { q: 'Jakie podatki płaci obcokrajowiec będący rezydentem Bali?',
    a: 'Po 183 dniach w Indonezji w roku kalendarzowym stajesz się rezydentem podatkowym. Progresywny PIT: 5% do IDR 60M (~$4K), 15% do 250M, 25% do 500M, 30% do 5B, 35% powyżej. Dochód światowy, ale z odliczeniami dzięki umowom o unikaniu podwójnego opodatkowania (Indonezja ma DTA z ponad 70 krajami, w tym USA, Wielka Brytania, Singapur, Australia, państwa UE).' },
  { q: 'Ile kosztuje szkoła międzynarodowa?',
    a: 'Poziom standardowy: Sunrise School, Australian Independent School, Cita Hati — $7-15K/rok na dziecko w szkole podstawowej. Premium: Green School Bali — $20-28K, Australian International School — $18-25K. Przedszkole (3-5 lat) — $5-10K/rok. Budżet na dwoje dzieci w szkole średniej: $20-35K/rok.' },
  { q: 'Jaka opieka zdrowotna jest dostępna?',
    a: 'Standard międzynarodowy: BIMC Kuta (partner Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu. Konsultacja u specjalisty $40-80, TK/MRI $200-400, operacja w trybie pilnym $5-15K. Ubezpieczenie międzynarodowe jest obowiązkowe (Allianz, Cigna, Bupa) — $1500-3500/rok na osobę dorosłą. Poważne operacje i onkologia zwykle kierowane do Singapuru lub Malezji.' },
  { q: 'Jaki jest miesięczny budżet dla czteroosobowej rodziny?',
    a: 'Komfortowo (dwoje dzieci w szkole międzynarodowej, dom 3-sypialniowy z ogrodem i basenem w Umalas, pomoc domowa 4 dni w tygodniu, jeden samochód): $5500-7500/miesiąc = $66-90K/rok. Premium (Green School, willa w Berawa, kierowca i pomoc domowa na pełen etat, dwa samochody): $9000-13000/miesiąc = $108-156K/rok. Minimum (bez szkoły, skromna willa 2-sypialniowa w Sanur): $2200-3000/miesiąc.' },
  { q: 'Czy mogę pracować zdalnie z Bali — internet i infrastruktura?',
    a: 'Tak. Infrastruktura biznesowa jest solidna: światłowód 200-1000 Mbps w Canggu, Berawa, Umalas, Sanur, większości kompleksów na Bukit. Coworking 24/7 (Outpost, Tropical Nomad, Dojo, Soul & Surf). Prąd jest stabilny, przerwy rzadkie. KITAS Investor lub B211A (z nową wizą cyfrowego nomada E33G od października 2025) legalnie obejmują pracę zdalną.' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Strona główna', item: `${SITE_URL}/en` },
      { '@type': 'ListItem', position: 2, name: 'Życie na Bali', item: `${SITE_URL}/pl/zycie-na-bali` },
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
    { Icon: Plane, title: 'Wizy i pobyt', body: 'KITAS Investor od $40K, Second Home Visa od depozytu $130K, Golden Visa od inwestycji $350K. Turystyczna B211A na 6-miesięczny okres próbny.' },
    { Icon: FileCheck2, title: 'Podatki rezydenta', body: 'Rezydent podatkowy po 183 dniach w roku. Progresywna skala 5-35%. Odliczenia DTA dostępne z ponad 70 krajami — obejmują większość rynków zachodnich i WNP.' },
    { Icon: GraduationCap, title: 'Szkoły', body: 'Sunrise / AIS / Cita Hati: $7-15K/rok. Premium — Green School ($20-28K) i AIS Premium. Silna społeczność międzynarodowa.' },
    { Icon: Stethoscope, title: 'Opieka zdrowotna', body: 'BIMC, Siloam, Kasih Ibu — kliniki o standardzie międzynarodowym. Ubezpieczenie obowiązkowe ($1500-3500/rok). Poważne operacje kierowane do Singapuru.' },
    { Icon: Wallet, title: 'Budżet rodzinny', body: 'Rodzina 4-osobowa: komfortowo $66-90K/rok, premium $108-156K/rok. Minimum bazowe bez szkół — od $2200/miesiąc.' },
    { Icon: Wifi, title: 'Praca zdalna', body: 'Światłowód 200-1000 Mbps we wszystkich dzielnicach inwestycyjnych. Coworking w Outpost / Tropical Nomad / Dojo. KITAS Investor lub nowa wiza cyfrowego nomada E33G legalnie obejmują pracę zdalną.' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Strona główna', href: '/pl' },
          { label: 'Życie na Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Życie na Bali — przewodnik po przeprowadzce
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Pozwolenia na pobyt przez KITAS, Second Home i Golden Visa, podatki dla obcokrajowców-rezydentów, realne budżety rodzinne,
              szkoły międzynarodowe, opieka zdrowotna i infrastruktura pracy zdalnej — zebrane od praktyków, którzy mieszkają
              na wyspie ponad 5 lat.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Zaktualizowano: {UPDATED}</p>
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
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Wizy — co pasuje do której sytuacji</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>B211A — wiza turystyczna.</strong> 60 dni z przedłużeniami do 6 miesięcy. Pasuje na okres próbny przed decyzją o przeprowadzce. Koszt $50-100 + opłata agenta $50-150.</p>
              <p><strong>E33G — wiza cyfrowego nomada (od października 2025).</strong> Do 1 roku, wymaga potwierdzonego dochodu od $60K+/rok spoza Indonezji. Nie pozwala pracować dla lokalnych firm, ale legalizuje pracę zdalną. Idealna dla freelancerów i pracowników zdalnych.</p>
              <p><strong>KITAS Investor.</strong> 1-2 lata z przedłużeniami, powiązana z PT PMA z inwestycją co najmniej $40K. Pozwala na pobyt, otwarcie lokalnego konta bankowego, kupno samochodu, uzyskanie ubezpieczenia zdrowotnego dla rezydentów. Najpopularniejszy format dla przedsiębiorców.</p>
              <p><strong>Second Home Visa.</strong> 5-10 lat, wymaga depozytu $130K w indonezyjskim banku (stopniowo wypłacalnego). Dla osób niezależnych finansowo, emerytów, zamożnych rodzin.</p>
              <p><strong>Golden Visa.</strong> 5-10 lat, inwestycja $350K (osoba prywatna) lub $25M (firma). Format najwyższego poziomu — maksimum praw i minimum kontroli przy odnawianiu.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Podatki rezydenta dla obcokrajowców</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>Po 183 dniach w Indonezji w ciągu 12 miesięcy jesteś rezydentem podatkowym. Od 2025 roku Indonezja stosuje opodatkowanie światowe: PIT płaci się od całego globalnego dochodu, nie tylko lokalnego.</p>
              <p>Skala progresywna: 5% do IDR 60M (~$4K), 15% do 250M (~$16K), 25% do 500M (~$32K), 30% do 5B (~$320K), 35% powyżej. Rok podatkowy = rok kalendarzowy, deklaracja do 31 marca.</p>
              <p>Umowy o unikaniu podwójnego opodatkowania zmniejszają obciążenie. Indonezja ma DTA z USA, Wielką Brytanią, Singapurem, Australią, wszystkimi państwami UE, Rosją, Kazachstanem, Białorusią, Ukrainą — około 70 krajów. Podatek zapłacony za granicą zalicza się na poczet zobowiązania w Indonezji.</p>
              <p>Przy strukturyzowaniu dochodu przez PT PMA: 22% podatku dochodowego od firm + 10% podatku u źródła od dywidendy wypłacanej nierezydentowi (skorygowane o DTA). Często efektywna stawka jest niższa niż PIT osobisty przy wysokich dochodach.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Szkoły międzynarodowe</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Przedszkole (3-5 lat):</strong> Sunrise Preschool, Sanggar Anak Tangguh, Australian Independent (wczesne lata) — $5-10K/rok. Silne programy Montessori, Reggio Emilia, Waldorf.</p>
              <p><strong>Szkoła podstawowa i średnia (poziom standardowy):</strong> Sunrise School (Bumin Sanur), Australian Independent School (Sanur), Cita Hati (Denpasar), Bali Island School (Sanur) — $7-15K/rok. Programy Cambridge i International Baccalaureate, angielski plus hiszpański/mandaryński/indonezyjski.</p>
              <p><strong>Premium:</strong> Green School Bali ($20-28K/rok) — znana na całym świecie ekologiczna szkoła z bambusa. Australian International School (Sanur, poziom premium $18-25K) — Cambridge IGCSE / A-level.</p>
              <p>Duża społeczność międzynarodowa (ponad 5000 rodzin ekspatów) — aktywne sieci rodziców, kluby weekendowe, wymiany językowe. Dostępne pełne pokrycie klas 1-12.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Opieka zdrowotna</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Kliniki o standardzie międzynarodowym:</strong> BIMC Kuta (partner Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu Hospital. Większość lekarzy mówi po angielsku, kilku ma certyfikaty międzynarodowe (US Board, AHPRA, GMC).</p>
              <p><strong>Ceny z własnej kieszeni:</strong> konsultacja u specjalisty $40-80, pełne badanie krwi $25-40, TK/MRI $200-400, umiarkowana operacja w trybie pilnym $5-15K, poród naturalny $2-4K, cesarskie cięcie $4-7K.</p>
              <p><strong>Ubezpieczenie jest obowiązkowe:</strong> Allianz Worldwide Care, Cigna Global, Bupa Global, Aetna International. Plan podstawowy dla osoby dorosłej 30-40 lat — $1500-2500/rok, premium z hospitalizacją w Singapurze — $3500-6000/rok.</p>
              <p>Poważna onkologia, kardiochirurgia, neurochirurgia — zwykle ewakuacja do Singapuru (Mount Elizabeth, Gleneagles) lub Malezji (Sunway Medical). Większość planów ubezpieczeniowych pokrywa ewakuację.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Realny koszt życia</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Kategoria</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Minimum</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Komfortowo</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Premium</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-[var(--color-border)]">
                  <tr><td className="font-semibold">Czynsz (3-sypialniowy)</td><td>$1000-1500</td><td>$2500-3500</td><td>$5000-9000</td></tr>
                  <tr><td className="font-semibold">Transport</td><td>$150 (skuter)</td><td>$500 (auto+skuter)</td><td>$1500 (kierowca)</td></tr>
                  <tr><td className="font-semibold">Jedzenie</td><td>$400</td><td>$1200</td><td>$2500</td></tr>
                  <tr><td className="font-semibold">Pomoc domowa</td><td>—</td><td>$200 (3 dni/tydz.)</td><td>$600 (pełen etat)</td></tr>
                  <tr><td className="font-semibold">Szkoła (2 dzieci)</td><td>—</td><td>$1500</td><td>$3500</td></tr>
                  <tr><td className="font-semibold">Ubezpieczenie rodzinne</td><td>$300</td><td>$600</td><td>$1200</td></tr>
                  <tr><td className="font-semibold">Inne</td><td>$200</td><td>$700</td><td>$1500</td></tr>
                  <tr className="font-semibold"><td>RAZEM /miesiąc</td><td>$2050-2550</td><td>$7200-8200</td><td>$15800-19800</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Często zadawane pytania
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
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Kolejne kroki</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/pl/inwestycje-nieruchomosci-bali" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Inwestycje w nieruchomości na Bali</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Rentowność, leasehold, podatki, ROI — pełny przewodnik inwestora.</p>
              </Link>
              <Link href="/pl/wille/umalas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Wille w Umalas — dzielnica mieszkaniowa</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Spokojna okolica dla rodzin z dziećmi, szkoły i infrastruktura w pobliżu.</p>
              </Link>
              <Link href="/pl/wille/sanur" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Wille w Sanur — spokojne wybrzeże</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Publiczność rodzinna, nadmorska promenada, niskie ryzyko.</p>
              </Link>
              <Link href="/pl/kontakt" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Kontakt</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Telegram, e-mail, kontakty partnerów.</p>
              </Link>
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
