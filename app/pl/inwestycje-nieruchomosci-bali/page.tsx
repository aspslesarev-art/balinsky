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
const UPDATED = '15 maja 2026'

export const metadata: Metadata = {
  title: 'Inwestycje w nieruchomości na Bali 2026 — realne stopy zwrotu, leasehold, podatki | Balinsky',
  description: 'Kompletny przewodnik po inwestycjach w nieruchomości na Bali dla obcokrajowców: realne 8-15% zysku netto, struktury leasehold i PT PMA, podatki, wyliczenia ROI oraz analizy przypadków w Canggu, Bukit i Ubud.',
  alternates: {
    canonical: '/pl/inwestycje-nieruchomosci-bali',
    languages: {
      ru: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
      pl: `${SITE_URL}/pl/inwestycje-nieruchomosci-bali`,
      'x-default': `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
    },
  },
  openGraph: {
    title: 'Inwestycje w nieruchomości na Bali 2026 — kompletny przewodnik dla obcokrajowców',
    description: '8-15% zysku netto, leasehold vs PT PMA, podatki, ROI według dzielnic. Realne liczby z analityki klasy Booking i studiów przypadków kupujących.',
    type: 'article',
    url: '/pl/inwestycje-nieruchomosci-bali',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inwestycje w nieruchomości na Bali 2026',
    description: 'Realne stopy zwrotu, leasehold, podatki, ROI według dzielnic. Zweryfikowane dane.',
    images: ['/andrei.jpg'],
  },
}

const FAQ = [
  { q: 'Jaka jest realna rentowność najmu willi na Bali w 2026 roku?',
    a: 'Na podstawie aktualnych danych klasy Booking z estatemarket.io: 8-12% rocznego zysku netto w Canggu i Bukit przy obłożeniu 70-80% z profesjonalnym zarządzaniem. Wille segmentu premium (nowe budynki z widokiem na ocean, 4+ sypialnie) sięgają nawet 15%. Ubud i Sanur dają 6-9% ze względu na niższe ADR. To wartości netto, po odliczeniu opłat za zarządzanie (15-20% przychodu), mediów, amortyzacji, podatków i okresów pustostanu.' },
  { q: 'Leasehold czy PT PMA — którą strukturę powinien wybrać inwestor zagraniczny?',
    a: 'Leasehold (długoterminowa dzierżawa gruntu, 25-80 lat) sprawdza się przy zakupie 1-2 nieruchomości indywidualnych. Taniej, szybciej (1-2 miesiące), bez potrzeby zakładania struktury korporacyjnej. PT PMA (indonezyjska spółka z udziałowcami zagranicznymi) ma sens przy portfelu 3+ jednostek lub nieruchomości komercyjnych. Umożliwia własność freehold, ale wymaga $25K kapitału wpłaconego, rocznej sprawozdawczości i podatku dochodowego od osób prawnych.' },
  { q: 'Jakie podatki płaci obcokrajowiec przy zakupie i posiadaniu nieruchomości na Bali?',
    a: 'Przy zakupie: 5% podatku od nabycia (BPHTB) + 1-2% notariusz + 3-5% prowizji agenta, jeśli dotyczy. Przy posiadaniu: PBB (podatek od nieruchomości) 0.1-0.3% wartości katastralnej rocznie. Od dochodu z najmu: 20% podatku dochodowego od osób fizycznych dla obcokrajowców (można obniżyć przez PT PMA). Przy sprzedaży: 2.5% podatku dochodowego od ceny sprzedaży.' },
  { q: 'Po ilu latach willa na Bali się zwraca?',
    a: 'Przy 10% rocznego zysku — 10 lat. Przy 12% — 8.3 roku. W praktyce: 7-10 lat w Canggu/Bukit z aktywnym zarządzaniem; 12-15 lat w spokojniejszych dzielnicach. Uważaj na leasehold z pozostałym okresem poniżej 30 lat w momencie zakupu — często nie domykają pełnego cyklu zwrotu wraz z zyskowną odsprzedażą.' },
  { q: 'Czym są PBG i SLF i dlaczego są kluczowe?',
    a: 'PBG (Persetujuan Bangunan Gedung) to pozwolenie na budowę, wydawane przed rozpoczęciem budowy. SLF (Sertifikat Laik Fungsi) to certyfikat zdatności do użytkowania, wydawany po zakończeniu budowy. Bez SLF jednostki nie można legalnie wynająć — Twój model inwestycyjny oficjalnie nie działa. Każda nieruchomość w katalogu Balinsky przechodzi kontrolę jakości tych dokumentów przed publikacją — to właśnie czyni nas redakcyjną, wyselekcjonowaną listą, a nie agregatorem.' },
  { q: 'Czy mogę uzyskać indonezyjskie zezwolenie na pobyt poprzez inwestycję w nieruchomość?',
    a: 'Nie istnieje bezpośredni program «nieruchomość za pobyt». Istnieje wiza inwestorska KITAS (od $40K zainwestowanych w PT PMA), Second Home Visa (od $130K zdeponowanych w banku indonezyjskim), Golden Visa (od $350K inwestycji indywidualnej, $25M dla firm). Sam zakup willi nie daje prawa pobytu — potrzebna jest struktura korporacyjna albo depozytowa.' },
]

const REGIONS = [
  { name: 'Canggu', slug: 'canggu', yieldRange: '10-13%', priceFrom: '$180K', niche: 'modna dzielnica, eventy, networking, najem dobowy' },
  { name: 'Bukit (Uluwatu/Pandawa/Ungasan)', slug: 'uluwatu', yieldRange: '10-15%', priceFrom: '$130K', niche: 'premium widoki na ocean, społeczność surferów, wysokie ADR' },
  { name: 'Ubud', slug: 'ubud', yieldRange: '6-9%', priceFrom: '$120K', niche: 'wellness, turystyka jogi, dłuższe pobyty' },
  { name: 'Sanur', slug: 'sanur', yieldRange: '5-8%', priceFrom: '$150K', niche: 'segment rodzinny, niskie ryzyko, stabilny popyt' },
  { name: 'Nusa Dua', slug: 'nusa-dua', yieldRange: '7-10%', priceFrom: '$200K', niche: 'premium hotele w pobliżu, podróże służbowe' },
  { name: 'Pererenan', slug: 'pererenan', yieldRange: '9-12%', priceFrom: '$160K', niche: 'spokojniejsze sąsiedztwo Canggu, rosnąca modna okolica' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Strona główna', item: `${SITE_URL}/en` },
      { '@type': 'ListItem', position: 2, name: 'Inwestycje w nieruchomości na Bali', item: `${SITE_URL}/pl/inwestycje-nieruchomosci-bali` },
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
          { label: 'Strona główna', href: '/pl' },
          { label: 'Inwestycje w nieruchomości na Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Inwestycje w nieruchomości na Bali — przewodnik 2026
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Realne 8-15% rocznego zysku netto, rozbicie ROI na 6 dzielnic, struktury prawne (leasehold i PT PMA),
              podatki dla właścicieli zagranicznych oraz redakcyjnie wyselekcjonowana lista nieruchomości ze zweryfikowanymi pozwoleniami.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Aktualizacja: {UPDATED}</p>
          </header>

          <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: TrendingUp, n: '8–15%', label: 'roczny zysk netto' },
              { Icon: Building2, n: '828+', label: 'jednostek w katalogu' },
              { Icon: ShieldCheck, n: '100%', label: 'zweryfikowane PBG + SLF' },
              { Icon: BarChart3, n: '6', label: 'dzielnic inwestycyjnych' },
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
              Dlaczego Bali to rynek nr 1 dla inwestorów zagranicznych w 2026 roku
            </h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>
                Bali to jedyny rynek turystyczny w Azji Południowo-Wschodniej, gdzie obcokrajowiec może legalnie posiadać nieruchomość mimo
                indonezyjskiego zakazu freehold dla obcokrajowców. Dzięki strukturom leasehold i PT PMA transakcje domykają się szybko
                i czysto, a stawki podatkowe należą do najniższych w regionie.
              </p>
              <p>
                Równolegle wyspa utrzymuje pozycję regionalnego lidera turystyki: 6-7 milionów zagranicznych
                turystów rocznie, 70-85% obłożenia w hotelach i wynajmach w Canggu i Bukit, średnia stawka dobowa (ADR) rosnąca
                o 8-12% rok do roku od 2023. Według <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a> —
                publicznej analityki Booking, którą pokazujemy w każdej karcie nieruchomości — realne dane o rentowności na poziomie sąsiedztwa są dostępne
                dosłownie ulica po ulicy w promieniu 1 km.
              </p>
              <p>
                To rzadka kombinacja: <strong>wysoki popyt turystyczny + legalne struktury przyjazne obcokrajowcom + niski próg wejścia</strong>
                ($120-200K za jednostkę startową). Żaden inny rynek Azji Południowo-Wschodniej nie łączy wszystkich trzech — Phuket i Ho Chi Minh
                są droższe i trudniejsze transakcyjnie, Samui i Langkawi mają słabszy popyt.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Rentowność według dzielnic — realne liczby na 2026
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-6">
              Te zakresy uśredniają porównywalne sąsiedztwa Booking z ostatnich 12 miesięcy, po odliczeniu opłat za zarządzanie,
              amortyzacji i podatków. Rozrzut pokazany jako 5. i 95. percentyl.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Dzielnica</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Rentowność</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Od</th>
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
                        <Link href={`/pl/wille`} className="text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                          przeglądaj <ChevronRight size={14} />
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
              Struktury prawne — leasehold vs PT PMA
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">Leasehold</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Długoterminowa dzierżawa gruntu od lokalnego właściciela — 25-80 lat, często z możliwością przedłużenia.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Minimum dokumentów i formalności</li>
                  <li>Domyka się w 1-2 miesiące u notariusza PPAT</li>
                  <li>Pasuje do 1-2 zakupów indywidualnych</li>
                  <li>Tańsze od PT PMA o $5-15K na transakcji</li>
                  <li className="text-[var(--color-text-muted)]">Nie jesteś właścicielem gruntu — masz jedynie prawo użytkowania</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">PT PMA</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Indonezyjska spółka z udziałowcami zagranicznymi — może posiadać grunt freehold.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Własność freehold</li>
                  <li>Pasuje do portfela 3+ jednostek</li>
                  <li>Umożliwia legalną działalność wynajmu</li>
                  <li>$25K kapitału wpłaconego + roczna sprawozdawczość</li>
                  <li className="text-[var(--color-text-muted)]">22% podatku dochodowego od osób prawnych</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              Pełny przewodnik po transakcji na stronie <Link href="/pl/jak-kupic" className="text-[var(--color-primary)] no-underline hover:underline">«Jak kupić nieruchomość na Bali»</Link>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Wyliczenie ROI — typowy przypadek
            </h2>
            <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-[var(--color-primary)]" />
                <strong>Willa 2BR w Canggu, $250K, leasehold na 30 lat</strong>
              </div>
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                <li>Cena zakupu: $250,000</li>
                <li>Koszty transakcyjne (notariusz, podatek BPHTB, due diligence): ~$15,000</li>
                <li>Średnia stawka: $200/noc × 75% obłożenia × 365 dni = $54,750/rok</li>
                <li>Wydatki (zarządzanie 18%, media, amortyzacja mebli, 20% podatku): ~$23,500/rok</li>
                <li>Przepływ netto: ~$31,250/rok → 12.5% rocznego zysku od nakładu $250K</li>
                <li>Zwrot: ~8 lat do progu rentowności, na dzierżawie pozostają 22 użyteczne lata najmu</li>
              </ul>
              <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
                Podobny kalkulator działa automatycznie na każdej stronie willi w naszym katalogu, zasilany realnymi
                danymi sąsiedztwa z <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a>.
              </p>
            </div>
          </section>

          <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Ryzyka, o których sprzedawcy nie mówią</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>Leasehold poniżej 30 lat.</strong> Nie odzyskasz inwestycji i nie odsprzedasz jej z zyskiem. Wymagaj co najmniej 35 pozostałych lat w momencie zakupu.</li>
                  <li><strong>Nieruchomość bez SLF.</strong> Legalny wynajem jest niemożliwy — Twój model rentowności nie istnieje na papierze.</li>
                  <li><strong>Deweloper bez PBG.</strong> Budowa może zostać wstrzymana przez władze, a Twój depozyt nie zostanie zwrócony.</li>
                  <li><strong>Grunt w strefie rolnej.</strong> Niektóre działki w Canggu/Pererenan są przeklasyfikowywane — sprawdź plan RDTR.</li>
                  <li><strong>Realne obłożenie poniżej obiecanego.</strong> Rentowność gwarantowana przez dewelopera jest zwykle zawyżona o 30-50%. Zweryfikuj z danymi sąsiedztwa Booking.</li>
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
