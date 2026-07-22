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
const UPDATED = '15 mei 2026'

export const metadata: Metadata = {
  title: 'Investeren in vastgoed op Bali 2026 — reële rendementen, leasehold, belastingen | Balinsky',
  description: 'Complete gids voor investeren in vastgoed op Bali voor buitenlanders: reële netto rendementen van 8-15%, leasehold- versus PT PMA-structuren, belastingen, ROI-berekeningen en praktijkcases in Canggu, Bukit en Ubud.',
  alternates: {
    canonical: '/nl/bali-vastgoed-investering',
    languages: {
      ru: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
      en: `${SITE_URL}/en/bali-property-investment`,
      nl: `${SITE_URL}/nl/bali-vastgoed-investering`,
      'x-default': `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
    },
  },
  openGraph: {
    title: 'Investeren in vastgoed op Bali 2026 — complete gids voor buitenlanders',
    description: '8-15% netto rendement, leasehold versus PT PMA, belastingen, ROI per regio. Echte cijfers uit analyses op Booking-niveau en praktijkcases van kopers.',
    type: 'article',
    url: '/nl/bali-vastgoed-investering',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Investeren in vastgoed op Bali 2026',
    description: 'Reële rendementen, leasehold, belastingen, ROI per regio. Geverifieerde data.',
    images: ['/andrei.jpg'],
  },
}

const FAQ = [
  { q: 'Wat is het realistische huurrendement van een villa op Bali in 2026?',
    a: 'Op basis van live data op Booking-niveau via estatemarket.io: 8-12% netto jaarrendement in Canggu en Bukit bij 70-80% bezetting met professioneel beheer. Villa’s in het premiumsegment (nieuwbouw met zeezicht, 4+ slaapkamers) halen tot 15%. Ubud en Sanur leveren 6-9% door een lagere ADR. Dit zijn nettocijfers, na beheerkosten (15-20% van de omzet), nutsvoorzieningen, afschrijving, belastingen en leegstand.' },
  { q: 'Leasehold of PT PMA — welke structuur moet een buitenlandse investeerder kiezen?',
    a: 'Leasehold (langlopende grondpacht, 25-80 jaar) past bij de aankoop van 1-2 individuele objecten. Goedkoper, sneller (1-2 maanden), geen bedrijfsstructuur nodig. Een PT PMA (Indonesische onderneming met buitenlandse aandeelhouders) is zinvol voor een portefeuille van 3+ units of commercieel vastgoed. Het maakt freehold-eigendom mogelijk, maar vereist $25K gestort kapitaal, jaarlijkse rapportage en vennootschapsbelasting.' },
  { q: 'Welke belastingen betaalt een buitenlander bij aankoop en bezit van vastgoed op Bali?',
    a: 'Bij aankoop: 5% overdrachtsbelasting (BPHTB) + 1-2% notaris + 3-5% makelaarscommissie indien van toepassing. Bij bezit: PBB (onroerendezaakbelasting) 0,1-0,3% van de kadastrale waarde per jaar. Op huurinkomsten: 20% inkomstenbelasting voor buitenlanders (te verlagen via een PT PMA). Bij verkoop: 2,5% inkomstenbelasting over de verkoopprijs.' },
  { q: 'Na hoeveel jaar heeft een villa op Bali zich terugverdiend?',
    a: 'Bij 10% jaarrendement — 10 jaar. Bij 12% — 8,3 jaar. In de praktijk: 7-10 jaar in Canggu/Bukit met actief beheer; 12-15 jaar in rustigere regio’s. Let op leaseholds met minder dan 30 jaar resterend bij aankoop — die doorlopen vaak geen volledige terugverdiencyclus plus winstgevende doorverkoop.' },
  { q: 'Wat zijn PBG en SLF, en waarom zijn ze cruciaal?',
    a: 'PBG (Persetujuan Bangunan Gedung) is de bouwvergunning, afgegeven vóór de bouw. SLF (Sertifikat Laik Fungsi) is het certificaat van gebruiksgeschiktheid, afgegeven bij oplevering. Zonder SLF mag de unit niet legaal worden verhuurd — uw investeringsmodel werkt officieel niet. Elk object in de Balinsky-catalogus wordt vóór publicatie op deze documenten gecontroleerd (QA) — dat maakt ons een redactionele shortlist, geen aggregator.' },
  { q: 'Kan ik via vastgoedinvestering een Indonesische verblijfsvergunning krijgen?',
    a: 'Er bestaat geen directe «vastgoed-voor-verblijf»-regeling. Er is een KITAS Investor Visa (vanaf $40K geïnvesteerd in een PT PMA), een Second Home Visa (vanaf $130K gestort bij een Indonesische bank) en een Golden Visa (vanaf $350K individuele investering, $25M voor bedrijven). Alleen een villa kopen geeft geen verblijfsrecht — daarvoor is een bedrijfs- of depositostructuur nodig.' },
]

const REGIONS = [
  { name: 'Canggu', slug: 'canggu', yieldRange: '10-13%', priceFrom: '$180K', niche: 'trendy regio, events, netwerken, dagverhuur' },
  { name: 'Bukit (Uluwatu/Pandawa/Ungasan)', slug: 'uluwatu', yieldRange: '10-15%', priceFrom: '$130K', niche: 'premium zeezicht, surfcommunity, hoge ADR' },
  { name: 'Ubud', slug: 'ubud', yieldRange: '6-9%', priceFrom: '$120K', niche: 'wellness, yogatoerisme, langere verblijven' },
  { name: 'Sanur', slug: 'sanur', yieldRange: '5-8%', priceFrom: '$150K', niche: 'gezinssegment, laag risico, stabiele vraag' },
  { name: 'Nusa Dua', slug: 'nusa-dua', yieldRange: '7-10%', priceFrom: '$200K', niche: 'premium hotels in de buurt, zakelijk reizen' },
  { name: 'Pererenan', slug: 'pererenan', yieldRange: '9-12%', priceFrom: '$160K', niche: 'rustiger, grenzend aan Canggu, opkomende trendregio' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/nl` },
      { '@type': 'ListItem', position: 2, name: 'Investeren in vastgoed op Bali', item: `${SITE_URL}/nl/bali-vastgoed-investering` },
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
          { label: 'Home', href: '/nl' },
          { label: 'Investeren in vastgoed op Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Investeren in vastgoed op Bali — gids 2026
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Reële netto jaarrendementen van 8-15%, ROI-uitsplitsing over 6 regio&apos;s, juridische structuren (leasehold en PT PMA),
              belastingen voor buitenlandse eigenaren en een redactionele shortlist van objecten met geverifieerde vergunningen.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Bijgewerkt: {UPDATED}</p>
          </header>

          <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: TrendingUp, n: '8–15%', label: 'netto jaarrendement' },
              { Icon: Building2, n: '828+', label: 'units in de catalogus' },
              { Icon: ShieldCheck, n: '100%', label: 'PBG + SLF geverifieerd' },
              { Icon: BarChart3, n: '6', label: 'investeringsregio\'s' },
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
              Waarom Bali in 2026 de nummer 1-markt is voor buitenlandse investeerders
            </h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>
                Bali is de enige toeristische markt in Zuidoost-Azië waar een buitenlander legaal vastgoed kan bezitten, ondanks
                het Indonesische verbod op freehold voor buitenlanders. Via leasehold- en PT PMA-structuren verlopen transacties snel
                en zuiver, en de belastingtarieven behoren tot de laagste van de regio.
              </p>
              <p>
                Tegelijk behoudt het eiland zijn positie als toeristische zwaargewicht van de regio: 6-7 miljoen internationale
                bezoekers per jaar, 70-85% bezetting in hotels en verhuur in Canggu en Bukit, en een gemiddelde dagprijs (ADR) die sinds
                2023 met 8-12% per jaar groeit. Volgens <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a> —
                de openbare Booking-analyses die we in elke objectkaart tonen — zijn er reële rendementscijfers op buurtniveau beschikbaar,
                letterlijk straat voor straat binnen een straal van 1 km.
              </p>
              <p>
                Dat is de zeldzame combinatie: <strong>hoge toeristische vraag + legale, buitenlandvriendelijke structuren + lage instapkosten</strong>
                ($120-200K voor een instap-unit). Geen enkele andere markt in Zuidoost-Azië combineert alle drie — Phuket en Ho Chi Minh
                zijn duurder en lastiger qua transacties, Samui en Langkawi hebben zwakkere vraag.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Rendementen per regio — echte cijfers voor 2026
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-6">
              Deze marges zijn gemiddelden van vergelijkbare Booking-buren over de afgelopen 12 maanden, na aftrek van beheerkosten,
              afschrijving en belastingen. De spreiding is weergegeven als 5e en 95e percentiel.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Regio</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Rendement</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Vanaf</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] hidden md:table-cell">Karakter</th>
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
                        <Link href={`/nl/villas`} className="text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                          bekijken <ChevronRight size={14} />
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
              Juridische structuren — leasehold versus PT PMA
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">Leasehold</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Langlopende grondpacht van een lokale eigenaar — 25-80 jaar, vaak verlengbaar.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Minimale papierwinkel en formaliteiten</li>
                  <li>Afgerond in 1-2 maanden bij een PPAT-notaris</li>
                  <li>Past bij 1-2 individuele aankopen</li>
                  <li>$5-15K per deal goedkoper dan een PT PMA</li>
                  <li className="text-[var(--color-text-muted)]">U bezit de grond niet — alleen het gebruiksrecht</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">PT PMA</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Indonesische onderneming met buitenlandse aandeelhouders — kan freehold-grond bezitten.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Freehold-eigendom</li>
                  <li>Past bij een portefeuille van 3+ units</li>
                  <li>Maakt legale verhuuractiviteiten mogelijk</li>
                  <li>$25K gestort kapitaal + jaarlijkse rapportage</li>
                  <li className="text-[var(--color-text-muted)]">22% vennootschapsbelasting</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              Volledige transactiegids op de pagina <Link href="/nl/hoe-te-kopen" className="text-[var(--color-primary)] no-underline hover:underline">«Hoe koop je vastgoed op Bali»</Link>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              ROI-berekening — typische case
            </h2>
            <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-[var(--color-primary)]" />
                <strong>Villa met 2 slaapkamers in Canggu, $250K, leasehold van 30 jaar</strong>
              </div>
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                <li>Aankoopprijs: $250.000</li>
                <li>Transactiekosten (notaris, BPHTB-belasting, due diligence): ~$15.000</li>
                <li>Gemiddelde prijs: $200/nacht × 75% bezetting × 365 dagen = $54.750/jaar</li>
                <li>Kosten (beheer 18%, nutsvoorzieningen, afschrijving meubilair, 20% belasting): ~$23.500/jaar</li>
                <li>Netto cashflow: ~$31.250/jaar → 12,5% jaarrendement op de investering van $250K</li>
                <li>Terugverdientijd: ~8 jaar tot break-even, er resteren 22 nuttige verhuurjaren op de pacht</li>
              </ul>
              <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
                Een soortgelijke calculator draait automatisch op elke villapagina in onze catalogus, gevoed met reële
                buurtdata van <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a>.
              </p>
            </div>
          </section>

          <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Risico&apos;s waar verkopers niet over praten</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>Leasehold onder 30 jaar.</strong> U verdient de investering niet terug én verkoopt niet met winst door. Eis bij aankoop minstens 35 resterende jaren.</li>
                  <li><strong>Object zonder SLF.</strong> Legale verhuur is onmogelijk — uw rendementsmodel bestaat op papier niet.</li>
                  <li><strong>Ontwikkelaar zonder PBG.</strong> De bouw kan door de autoriteiten worden stilgelegd en uw aanbetaling wordt niet terugbetaald.</li>
                  <li><strong>Grond in landbouwzone.</strong> Sommige percelen in Canggu/Pererenan worden geherclassificeerd — controleer het RDTR-plan.</li>
                  <li><strong>Reële bezetting lager dan beloofd.</strong> Door ontwikkelaars gegarandeerde rendementen zijn doorgaans 30-50% te hoog voorgesteld. Controleer dit tegen Booking-buurtdata.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Hoe we objecten in de catalogus verifiëren
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-4">
              Elk object bij Balinsky doorloopt vóór publicatie een redactionele QA. Dit is geen alles-verzamelende aggregator —
              alleen projecten waarbij vergunningen (PBG, SLF), grondstructuur (bestemming, RDTR) en ontwikkelaar (PT-registratie) met de hand
              zijn geverifieerd.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <FileCheck2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Documenten</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PBG, SLF, IMB, AJB / notariële akte — gecontroleerd tegen de registers van het ATR/BPN-ministerie.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Building2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Ontwikkelaar</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PT-registratie, portfolio van opgeleverde projecten, reputatie binnen de lokale makelaarsgemeenschap.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <MapPin size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Locatie</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Bezoek ter plaatse, foto en video van het terrein, infrastructuurcheck binnen 500m.</p>
              </div>
            </div>
            <div className="mt-6 text-[14px]">
              Meer op <Link href="/nl/over-ons" className="text-[var(--color-primary)] no-underline hover:underline">«Over Balinsky»</Link>.
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Volgende stappen
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/nl/villas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villacatalogus</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Elke villa met foto&apos;s, prijzen, vergunningen en ROI-berekening.</p>
              </Link>
              <Link href="/nl/appartementen" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Appartementencatalogus</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Units in beheerde complexen — de laagste instapdrempel.</p>
              </Link>
              <Link href="/nl/wooncomplexen" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Wooncomplexen</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Off-plan en opgeleverde complexen met beheer, renders en opleverdata.</p>
              </Link>
              <Link href="/nl/hoe-te-kopen" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Hoe te kopen — stap voor stap</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Zeven stappen van de transactie, eigendomsstructuren, reële kosten en valkuilen.</p>
              </Link>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Veelgestelde vragen
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
      <Footer lang="nl" />
    </>
  )
}
