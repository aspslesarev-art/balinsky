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
const UPDATED = '15 mei 2026'

export const metadata: Metadata = {
  title: 'Wonen op Bali — visa, belastingen, scholen, zorg 2026 | Balinsky',
  description: 'Verhuisgids voor Bali: KITAS, Second Home Visa, Golden Visa, belastingen voor buitenlandse ingezetenen, internationale scholen, BIMC- en Siloam-ziekenhuizen en reële gezinsbudgetten.',
  alternates: {
    canonical: '/nl/wonen-op-bali',
    languages: {
      ru: `${SITE_URL}/ru/zhizn-na-bali`,
      en: `${SITE_URL}/en/living-in-bali`,
      nl: `${SITE_URL}/nl/wonen-op-bali`,
      'x-default': `${SITE_URL}/ru/zhizn-na-bali`,
    },
  },
  openGraph: {
    title: 'Wonen op Bali — verhuisgids 2026',
    description: 'KITAS, Second Home Visa, Golden Visa, belastingen voor ingezetenen, scholen, zorg, gezinsbudget — van operators die hier 5+ jaar wonen.',
    type: 'article',
    url: '/nl/wonen-op-bali',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wonen op Bali — verhuisgids 2026',
    description: 'Visa, belastingen, scholen, zorg, budget.',
    images: ['/andrei.jpg'],
  },
}

const FAQ = [
  { q: 'Welk visum werkt voor langdurige verhuizing naar Bali?',
    a: 'Basis: B211A (toeristisch, tot 6 maanden met verlengingen) voor een proefperiode. KITAS Investor (1-2 jaar, vanaf $40K geïnvesteerd in een PT PMA) voor ondernemers en investeerders. KITAS Working — via een Indonesische werkgever. Second Home Visa (5-10 jaar, $130K deposito bij een lokale bank) voor financieel onafhankelijke aanvragers. Golden Visa (5-10 jaar, $350K+ investering) — topsegment voor vermogende particulieren.' },
  { q: 'Welke belastingen betaalt een buitenlandse ingezetene op Bali?',
    a: 'Na 183 dagen in Indonesië in een kalenderjaar word je fiscaal ingezetene. Progressieve inkomstenbelasting: 5% tot IDR 60M (~$4K), 15% tot 250M, 25% tot 500M, 30% tot 5B, 35% daarboven. Wereldwijd inkomen, maar met verrekening via belastingverdragen (Indonesië heeft DTA’s met 70+ landen, waaronder de VS, VK, Singapore, Australië en EU-lidstaten).' },
  { q: 'Wat kost een internationale school?',
    a: 'Standaardniveau: Sunrise School, Australian Independent School, Cita Hati — $7-15K/jaar per kind op de basisschool. Premium: Green School Bali — $20-28K, Australian International School — $18-25K. Voorschools (3-5 jaar) — $5-10K/jaar. Budget voor twee kinderen op de middenschool: $20-35K/jaar.' },
  { q: 'Welke zorg is beschikbaar?',
    a: 'Internationaal niveau: BIMC Kuta (aangesloten bij Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu. Consult bij een specialist $40-80, CT/MRI $200-400, spoedoperatie $5-15K. Een internationale verzekering is verplicht (Allianz, Cigna, Bupa) — $1500-3500/jaar per volwassene. Zware operaties en oncologie worden doorgaans doorverwezen naar Singapore of Maleisië.' },
  { q: 'Wat is het maandbudget voor een gezin van vier?',
    a: 'Comfortabel (twee kinderen op een internationale school, huis met 3 slaapkamers, tuin en zwembad in Umalas, hulp 4 dagen/week, één auto): $5500-7500/maand = $66-90K/jaar. Premium (Green School, villa in Berawa, fulltime chauffeur en hulp, twee auto’s): $9000-13000/maand = $108-156K/jaar. Minimaal (geen school, bescheiden villa met 2 slaapkamers in Sanur): $2200-3000/maand.' },
  { q: 'Kan ik op afstand werken vanaf Bali — internet en infrastructuur?',
    a: 'Ja. De zakelijke infrastructuur is degelijk: glasvezel 200-1000 Mbps in Canggu, Berawa, Umalas, Sanur en de meeste Bukit-complexen. 24/7 coworking (Outpost, Tropical Nomad, Dojo, Soul & Surf). De stroom is stabiel, storingen zijn zeldzaam. KITAS Investor of B211A (met het nieuwe E33G digital nomad-visum vanaf oktober 2025) dekken werken op afstand legaal.' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/nl` },
      { '@type': 'ListItem', position: 2, name: 'Wonen op Bali', item: `${SITE_URL}/nl/wonen-op-bali` },
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
    { Icon: Plane, title: 'Visa & verblijf', body: 'KITAS Investor vanaf $40K, Second Home Visa vanaf $130K deposito, Golden Visa vanaf $350K investering. Toeristisch B211A voor de proefperiode van 6 maanden.' },
    { Icon: FileCheck2, title: 'Belastingen voor ingezetenen', body: 'Fiscaal ingezetene na 183 dagen per jaar. Progressief tarief van 5-35%. DTA-verrekening beschikbaar met 70+ landen — de meeste westerse en GOS-markten gedekt.' },
    { Icon: GraduationCap, title: 'Scholen', body: 'Sunrise / AIS / Cita Hati: $7-15K/jaar. Premium — Green School ($20-28K) en AIS Premium. Sterke internationale gemeenschap.' },
    { Icon: Stethoscope, title: 'Zorg', body: 'BIMC, Siloam, Kasih Ibu — klinieken van internationaal niveau. Verzekering verplicht ($1500-3500/jaar). Zware operaties naar Singapore.' },
    { Icon: Wallet, title: 'Gezinsbudget', body: 'Gezin van 4: comfortabel $66-90K/jaar, premium $108-156K/jaar. Absoluut minimum zonder scholen — vanaf $2200/maand.' },
    { Icon: Wifi, title: 'Werken op afstand', body: 'Glasvezel 200-1000 Mbps in alle investeringsregio’s. Coworking bij Outpost / Tropical Nomad / Dojo. KITAS Investor of het nieuwe E33G digital nomad-visum dekken werken op afstand legaal.' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Home', href: '/nl' },
          { label: 'Wonen op Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Wonen op Bali — verhuisgids
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Verblijfsvergunningen via KITAS, Second Home en Golden Visa, belastingen voor buitenlandse ingezetenen, reële gezinsbudgetten,
              internationale scholen, zorg en infrastructuur voor werken op afstand — verzameld door operators die al
              5+ jaar op het eiland wonen.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Bijgewerkt: {UPDATED}</p>
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
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Visa — wat past bij welke situatie</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>B211A — toeristenvisum.</strong> 60 dagen met verlengingen tot 6 maanden. Geschikt voor de proefperiode voordat je definitief verhuist. Kosten $50-100 + agentkosten $50-150.</p>
              <p><strong>E33G — digital nomad-visum (sinds oktober 2025).</strong> Tot 1 jaar, vereist een geverifieerd inkomen van $60K+/jaar van buiten Indonesië. Staat geen werk voor lokale bedrijven toe, maar legaliseert werken op afstand. Ideaal voor freelancers en remote werkers.</p>
              <p><strong>KITAS Investor.</strong> 1-2 jaar met verlengingen, gekoppeld aan een PT PMA met minstens $40K geïnvesteerd. Geeft recht op verblijf, het openen van een lokale bankrekening, het kopen van een auto en een ziektekostenverzekering voor ingezetenen. Populairste vorm onder ondernemers.</p>
              <p><strong>Second Home Visa.</strong> 5-10 jaar, vereist een deposito van $130K bij een Indonesische bank (geleidelijk opneembaar). Voor financieel onafhankelijke aanvragers, gepensioneerden en welgestelde gezinnen.</p>
              <p><strong>Golden Visa.</strong> 5-10 jaar, $350K (particulier) of $25M (bedrijf) investering. Topsegment — maximale rechten en minimale verlengingscontroles.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Belastingen voor buitenlandse ingezetenen</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>Na 183 dagen in Indonesië binnen 12 maanden ben je fiscaal ingezetene. Sinds 2025 past Indonesië wereldwijde belastingheffing toe: inkomstenbelasting wordt geheven over al je wereldwijde inkomen, niet alleen het lokale.</p>
              <p>Progressief tarief: 5% tot IDR 60M (~$4K), 15% tot 250M (~$16K), 25% tot 500M (~$32K), 30% tot 5B (~$320K), 35% daarboven. Belastingjaar = kalenderjaar, aangifte uiterlijk 31 maart.</p>
              <p>Belastingverdragen verlichten de last. Indonesië heeft DTA’s met de VS, VK, Singapore, Australië, alle EU-lidstaten, Rusland, Kazachstan, Wit-Rusland en Oekraïne — ongeveer 70 landen. In het buitenland betaalde belasting wordt verrekend met de Indonesische aanslag.</p>
              <p>Bij inkomensstructurering via een PT PMA: 22% vennootschapsbelasting + 10% dividendbelasting bij uitkering aan een niet-ingezetene (aangepast volgens DTA). Vaak is het effectieve tarief lager dan de persoonlijke inkomstenbelasting bij hoge inkomens.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Internationale scholen</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Voorschool (3-5 jaar):</strong> Sunrise Preschool, Sanggar Anak Tangguh, Australian Independent (early years) — $5-10K/jaar. Sterke Montessori-, Reggio Emilia- en Waldorf-programma’s.</p>
              <p><strong>Basis- en middenschool (standaardniveau):</strong> Sunrise School (Bumin Sanur), Australian Independent School (Sanur), Cita Hati (Denpasar), Bali Island School (Sanur) — $7-15K/jaar. Cambridge- en International Baccalaureate-curricula, Engels plus Spaans/Mandarijn/Indonesisch.</p>
              <p><strong>Premium:</strong> Green School Bali ($20-28K/jaar) — de internationaal bekende, milieuvriendelijke bamboeschool. Australian International School (Sanur, premiumniveau $18-25K) — Cambridge IGCSE / A-level.</p>
              <p>Grote internationale gemeenschap (5000+ expatgezinnen) — actieve oudernetwerken, weekendclubs en taaluitwisselingen. Volledige dekking van klas 1 tot en met 12 beschikbaar.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Zorg</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Klinieken van internationaal niveau:</strong> BIMC Kuta (aangesloten bij Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu Hospital. De meeste artsen spreken Engels, meerdere hebben internationale certificeringen (US Board, AHPRA, GMC).</p>
              <p><strong>Prijzen bij zelf betalen:</strong> consult bij een specialist $40-80, volledig bloedonderzoek $25-40, CT/MRI $200-400, matige spoedoperatie $5-15K, natuurlijke bevalling $2-4K, keizersnede $4-7K.</p>
              <p><strong>Een verzekering is verplicht:</strong> Allianz Worldwide Care, Cigna Global, Bupa Global, Aetna International. Basispakket voor een volwassene van 30-40 — $1500-2500/jaar, premium met ziekenhuisopname in Singapore — $3500-6000/jaar.</p>
              <p>Zware oncologie, hartchirurgie en neurochirurgie — doorgaans geëvacueerd naar Singapore (Mount Elizabeth, Gleneagles) of Maleisië (Sunway Medical). De meeste verzekeringspakketten dekken evacuatie.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Reële kosten van levensonderhoud</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Categorie</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Minimum</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Comfortabel</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Premium</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-[var(--color-border)]">
                  <tr><td className="font-semibold">Huur (3 slaapkamers)</td><td>$1000-1500</td><td>$2500-3500</td><td>$5000-9000</td></tr>
                  <tr><td className="font-semibold">Vervoer</td><td>$150 (scooter)</td><td>$500 (auto+scooter)</td><td>$1500 (chauffeur)</td></tr>
                  <tr><td className="font-semibold">Eten</td><td>$400</td><td>$1200</td><td>$2500</td></tr>
                  <tr><td className="font-semibold">Hulp</td><td>—</td><td>$200 (3 dagen/wk)</td><td>$600 (fulltime)</td></tr>
                  <tr><td className="font-semibold">School (2 kinderen)</td><td>—</td><td>$1500</td><td>$3500</td></tr>
                  <tr><td className="font-semibold">Gezinsverzekering</td><td>$300</td><td>$600</td><td>$1200</td></tr>
                  <tr><td className="font-semibold">Overig</td><td>$200</td><td>$700</td><td>$1500</td></tr>
                  <tr className="font-semibold"><td>TOTAAL /maand</td><td>$2050-2550</td><td>$7200-8200</td><td>$15800-19800</td></tr>
                </tbody>
              </table>
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

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Volgende stappen</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/nl/bali-vastgoed-investering" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Investeren in vastgoed op Bali</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Rendementen, leasehold, belastingen, ROI — de volledige investeerdersgids.</p>
              </Link>
              <Link href="/nl/villas/umalas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villa&apos;s in Umalas — woonwijk</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Rustige buurt voor gezinnen met kinderen, scholen en infrastructuur dichtbij.</p>
              </Link>
              <Link href="/nl/villas/sanur" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villa&apos;s in Sanur — rustige kust</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Gezinspubliek, strandboulevard, laag risico.</p>
              </Link>
              <Link href="/nl/contact" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Contact</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Telegram, e-mail, partnercontacten.</p>
              </Link>
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
