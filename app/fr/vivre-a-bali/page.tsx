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
const UPDATED = '15 mai 2026'

export const metadata: Metadata = {
  title: 'Vivre à Bali — Visas, taxes, écoles, santé 2026 | Balinsky',
  description: "Guide d'installation à Bali : KITAS, Second Home Visa, Golden Visa, fiscalité des résidents étrangers, écoles internationales, hôpitaux BIMC et Siloam, budgets familiaux réels.",
  alternates: {
    canonical: '/fr/vivre-a-bali',
    languages: {
      ru: `${SITE_URL}/ru/zhizn-na-bali`,
      en: `${SITE_URL}/en/living-in-bali`,
      fr: `${SITE_URL}/fr/vivre-a-bali`,
      'x-default': `${SITE_URL}/ru/zhizn-na-bali`,
    },
  },
  openGraph: {
    title: "Vivre à Bali — Guide d'installation 2026",
    description: "KITAS, Second Home Visa, Golden Visa, fiscalité des résidents, écoles, santé, budget familial — par des opérateurs qui vivent ici depuis plus de 5 ans.",
    type: 'article',
    url: '/fr/vivre-a-bali',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Vivre à Bali — Guide d'installation 2026",
    description: 'Visas, taxes, écoles, santé, budget.',
    images: ['/balina.jpg'],
  },
}

const FAQ = [
  { q: "Quel visa convient pour une installation de long terme à Bali ?",
    a: "Base : B211A (touristique, jusqu'à 6 mois avec prolongations) pour une période d'essai. KITAS Investor (1-2 ans, à partir de 40 000 $ investis dans une PT PMA) pour les entrepreneurs et investisseurs. KITAS Working — via un employeur indonésien. Second Home Visa (5-10 ans, dépôt de 130 000 $ dans une banque locale) pour les candidats financièrement indépendants. Golden Visa (5-10 ans, investissement de 350 000 $ et plus) — le niveau supérieur pour les grandes fortunes." },
  { q: "Quelles taxes un résident étranger paie-t-il à Bali ?",
    a: "Après 183 jours en Indonésie dans une année civile, vous devenez résident fiscal. IRPP progressif : 5 % jusqu'à 60 M IDR (~4 K$), 15 % jusqu'à 250 M, 25 % jusqu'à 500 M, 30 % jusqu'à 5 Md, 35 % au-delà. Revenu mondial, mais compensations via les conventions fiscales (l'Indonésie a des conventions avec plus de 70 pays, dont les États-Unis, le Royaume-Uni, Singapour, l'Australie, les membres de l'UE)." },
  { q: "Combien coûte une école internationale ?",
    a: "Gamme standard : Sunrise School, Australian Independent School, Cita Hati — 7-15 K$/an par enfant de primaire. Premium : Green School Bali — 20-28 K$, Australian International School — 18-25 K$. Maternelle (3-5 ans) — 5-10 K$/an. Budget pour deux enfants au collège : 20-35 K$/an." },
  { q: "Quels soins de santé sont disponibles ?",
    a: "Standard international : BIMC Kuta (affilié à la Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu. Consultation de spécialiste 40-80 $, scanner/IRM 200-400 $, chirurgie d'urgence 5-15 K$. Une assurance internationale est obligatoire (Allianz, Cigna, Bupa) — 1500-3500 $/an par adulte. Les chirurgies lourdes et l'oncologie sont généralement orientées vers Singapour ou la Malaisie." },
  { q: "Quel est le budget mensuel pour une famille de quatre ?",
    a: "Confortable (deux enfants en école internationale, maison 3 chambres avec jardin et piscine à Umalas, aide-ménagère 4 jours/semaine, une voiture) : 5500-7500 $/mois = 66-90 K$/an. Premium (Green School, villa à Berawa, chauffeur et aide à plein temps, deux voitures) : 9000-13000 $/mois = 108-156 K$/an. Minimum (sans école, modeste villa 2 chambres à Sanur) : 2200-3000 $/mois." },
  { q: "Puis-je télétravailler depuis Bali — internet et infrastructures ?",
    a: "Oui. L'infrastructure professionnelle est solide : fibre 200-1000 Mbps à Canggu, Berawa, Umalas, Sanur, dans la plupart des complexes de Bukit. Coworking 24h/24 (Outpost, Tropical Nomad, Dojo, Soul & Surf). L'électricité est stable, les coupures rares. Le KITAS Investor ou le B211A (avec le nouveau visa nomade digital E33G depuis octobre 2025) couvrent légalement le télétravail." },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/fr` },
      { '@type': 'ListItem', position: 2, name: 'Vivre à Bali', item: `${SITE_URL}/fr/vivre-a-bali` },
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
    { Icon: Plane, title: 'Visas et résidence', body: 'KITAS Investor à partir de 40 K$, Second Home Visa à partir de 130 K$ de dépôt, Golden Visa à partir de 350 K$ d\'investissement. B211A touristique pour la période d\'essai de 6 mois.' },
    { Icon: FileCheck2, title: 'Fiscalité des résidents', body: 'Résident fiscal après 183 jours dans l\'année. Barème progressif de 5-35 %. Compensations par convention fiscale avec plus de 70 pays — la plupart des marchés occidentaux et de la CEI sont couverts.' },
    { Icon: GraduationCap, title: 'Écoles', body: 'Sunrise / AIS / Cita Hati : 7-15 K$/an. Premium — Green School (20-28 K$) et AIS Premium. Forte communauté internationale.' },
    { Icon: Stethoscope, title: 'Santé', body: 'BIMC, Siloam, Kasih Ibu — cliniques de niveau international. Assurance obligatoire (1500-3500 $/an). Les chirurgies lourdes sont orientées vers Singapour.' },
    { Icon: Wallet, title: 'Budget familial', body: 'Famille de 4 : confortable 66-90 K$/an, premium 108-156 K$/an. Minimum de base sans écoles — à partir de 2200 $/mois.' },
    { Icon: Wifi, title: 'Télétravail', body: 'Fibre 200-1000 Mbps dans tous les quartiers d\'investissement. Coworking chez Outpost / Tropical Nomad / Dojo. Le KITAS Investor ou le nouveau visa nomade digital E33G couvrent légalement le télétravail.' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Accueil', href: '/fr' },
          { label: 'Vivre à Bali' },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Vivre à Bali — Guide d&apos;installation
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Permis de séjour via KITAS, Second Home et Golden Visa, fiscalité des résidents étrangers, budgets familiaux réels,
              écoles internationales, santé et infrastructures de télétravail — recueillis auprès d&apos;opérateurs qui vivent
              sur l&apos;île depuis plus de 5 ans.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Mis à jour : {UPDATED}</p>
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
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Visas — ce qui convient à chaque situation</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>B211A — visa touristique.</strong> 60 jours avec prolongations jusqu&apos;à 6 mois. Convient à la période d&apos;essai avant de s&apos;engager dans une installation. Coût 50-100 $ + honoraires d&apos;agent 50-150 $.</p>
              <p><strong>E33G — visa nomade digital (depuis octobre 2025).</strong> Jusqu&apos;à 1 an, exige un revenu vérifié de 60 K$ et plus par an provenant de l&apos;extérieur de l&apos;Indonésie. Ne permet pas de travailler pour des entreprises locales mais légalise le télétravail. Idéal pour les freelances et télétravailleurs.</p>
              <p><strong>KITAS Investor.</strong> 1-2 ans avec prolongations, lié à une PT PMA avec au moins 40 K$ investis. Permet la résidence, l&apos;ouverture d&apos;un compte bancaire local, l&apos;achat d&apos;une voiture, l&apos;obtention d&apos;une assurance santé résident. Le format le plus populaire chez les entrepreneurs.</p>
              <p><strong>Second Home Visa.</strong> 5-10 ans, exige un dépôt de 130 K$ dans une banque indonésienne (retirable progressivement). Pour les candidats financièrement indépendants, les retraités, les familles aisées.</p>
              <p><strong>Golden Visa.</strong> 5-10 ans, investissement de 350 K$ (individuel) ou 25 M$ (société). Format haut de gamme — droits maximaux et contrôles de renouvellement minimaux.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Fiscalité des résidents étrangers</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>Après 183 jours en Indonésie sur 12 mois, vous êtes résident fiscal. Depuis 2025, l&apos;Indonésie applique une imposition mondiale : l&apos;IRPP est dû sur tous les revenus mondiaux, pas seulement locaux.</p>
              <p>Barème progressif : 5 % jusqu&apos;à 60 M IDR (~4 K$), 15 % jusqu&apos;à 250 M (~16 K$), 25 % jusqu&apos;à 500 M (~32 K$), 30 % jusqu&apos;à 5 Md (~320 K$), 35 % au-delà. Année fiscale = année civile, déclaration à déposer avant le 31 mars.</p>
              <p>Les conventions fiscales allègent la charge. L&apos;Indonésie a des conventions avec les États-Unis, le Royaume-Uni, Singapour, l&apos;Australie, tous les membres de l&apos;UE, la Russie, le Kazakhstan, la Biélorussie, l&apos;Ukraine — environ 70 pays. L&apos;impôt payé à l&apos;étranger s&apos;impute sur la dette fiscale indonésienne.</p>
              <p>Pour structurer les revenus via une PT PMA : 22 % d&apos;impôt sur les sociétés + 10 % de retenue sur les dividendes versés à un non-résident (ajustée par convention). L&apos;effet est souvent un taux effectif inférieur à l&apos;IRPP personnel sur les gros revenus.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Écoles internationales</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Maternelle (3-5 ans) :</strong> Sunrise Preschool, Sanggar Anak Tangguh, Australian Independent (petite enfance) — 5-10 K$/an. Solides programmes Montessori, Reggio Emilia, Waldorf.</p>
              <p><strong>Primaire et collège (gamme standard) :</strong> Sunrise School (Bumin Sanur), Australian Independent School (Sanur), Cita Hati (Denpasar), Bali Island School (Sanur) — 7-15 K$/an. Programmes Cambridge et Baccalauréat International, anglais plus espagnol/mandarin/indonésien.</p>
              <p><strong>Premium :</strong> Green School Bali (20-28 K$/an) — école en bambou écoresponsable de renommée internationale. Australian International School (Sanur, gamme premium 18-25 K$) — Cambridge IGCSE / A-level.</p>
              <p>Grande communauté internationale (plus de 5000 familles expatriées) — réseaux de parents actifs, clubs du week-end, échanges linguistiques. Couverture complète de la 1re à la 12e année disponible.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Santé</h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p><strong>Cliniques de niveau international :</strong> BIMC Kuta (affilié à la Cleveland Clinic), BIMC Nusa Dua, Siloam Hospital Denpasar, Kasih Ibu Hospital. La plupart des médecins parlent anglais, plusieurs disposent de certifications internationales (US Board, AHPRA, GMC).</p>
              <p><strong>Tarifs sans assurance :</strong> consultation de spécialiste 40-80 $, bilan sanguin complet 25-40 $, scanner/IRM 200-400 $, chirurgie d&apos;urgence modérée 5-15 K$, accouchement naturel 2-4 K$, césarienne 4-7 K$.</p>
              <p><strong>L&apos;assurance est obligatoire :</strong> Allianz Worldwide Care, Cigna Global, Bupa Global, Aetna International. Formule de base pour un adulte de 30-40 ans — 1500-2500 $/an, premium avec hospitalisation à Singapour — 3500-6000 $/an.</p>
              <p>Oncologie lourde, chirurgie cardiaque, neurochirurgie — généralement évacuées vers Singapour (Mount Elizabeth, Gleneagles) ou la Malaisie (Sunway Medical). La plupart des assurances couvrent l&apos;évacuation.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Coût de la vie réel</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Catégorie</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Minimum</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Confortable</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Premium</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-[var(--color-border)]">
                  <tr><td className="font-semibold">Loyer (3 chambres)</td><td>$1000-1500</td><td>$2500-3500</td><td>$5000-9000</td></tr>
                  <tr><td className="font-semibold">Transport</td><td>$150 (scooter)</td><td>$500 (voiture+scooter)</td><td>$1500 (chauffeur)</td></tr>
                  <tr><td className="font-semibold">Alimentation</td><td>$400</td><td>$1200</td><td>$2500</td></tr>
                  <tr><td className="font-semibold">Aide-ménagère</td><td>—</td><td>$200 (3 jours/sem)</td><td>$600 (plein temps)</td></tr>
                  <tr><td className="font-semibold">École (2 enfants)</td><td>—</td><td>$1500</td><td>$3500</td></tr>
                  <tr><td className="font-semibold">Assurance familiale</td><td>$300</td><td>$600</td><td>$1200</td></tr>
                  <tr><td className="font-semibold">Autres</td><td>$200</td><td>$700</td><td>$1500</td></tr>
                  <tr className="font-semibold"><td>TOTAL /mois</td><td>$2050-2550</td><td>$7200-8200</td><td>$15800-19800</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Questions fréquentes
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
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">Prochaines étapes</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/fr/investissement-immobilier-bali" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Investir dans l&apos;immobilier à Bali</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Rendements, leasehold, taxes, ROI — guide complet de l&apos;investisseur.</p>
              </Link>
              <Link href="/fr/villas/umalas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villas à Umalas — quartier résidentiel</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Zone calme pour les familles avec enfants, écoles et infrastructures à proximité.</p>
              </Link>
              <Link href="/fr/villas/sanur" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Villas à Sanur — côte tranquille</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Public familial, promenade en bord de mer, faible risque.</p>
              </Link>
              <Link href="/fr/contact" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Contact</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Telegram, e-mail, contacts partenaires.</p>
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
