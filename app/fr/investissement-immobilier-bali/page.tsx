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
const UPDATED = '15 mai 2026'

export const metadata: Metadata = {
  title: "Investir dans l'immobilier à Bali 2026 — Rendements réels, leasehold, taxes | Balinsky",
  description: "Guide complet de l'investissement immobilier à Bali pour les étrangers : rendements nets réels de 8-15 %, structures leasehold vs PT PMA, taxes, calculs de ROI et études de cas à Canggu, Bukit, Ubud.",
  alternates: {
    canonical: '/fr/investissement-immobilier-bali',
    languages: {
      ru: `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
      en: `${SITE_URL}/en/bali-property-investment`,
      fr: `${SITE_URL}/fr/investissement-immobilier-bali`,
      'x-default': `${SITE_URL}/ru/investicii-v-nedvizhimost-bali`,
    },
  },
  openGraph: {
    title: "Investir dans l'immobilier à Bali 2026 — Guide complet pour les étrangers",
    description: "Rendements nets de 8-15 %, leasehold vs PT PMA, taxes, ROI par quartier. Chiffres réels issus d'analytiques de niveau Booking et d'études de cas d'acheteurs.",
    type: 'article',
    url: '/fr/investissement-immobilier-bali',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Investir dans l'immobilier à Bali 2026",
    description: 'Rendements réels, leasehold, taxes, ROI par quartier. Données vérifiées.',
    images: ['/balina.jpg'],
  },
}

const FAQ = [
  { q: 'Quel est le rendement locatif réaliste pour une villa à Bali en 2026 ?',
    a: "D'après les données en direct de niveau Booking via estatemarket.io : rendement net annuel de 8-12 % à Canggu et Bukit, avec un taux d'occupation de 70-80 % et une gestion professionnelle. Les villas du segment premium (constructions neuves avec vue sur l'océan, 4 chambres et plus) atteignent jusqu'à 15 %. Ubud et Sanur rapportent 6-9 % en raison d'un ADR plus faible. Ce sont des chiffres nets, après frais de gestion (15-20 % des revenus), charges, amortissement, taxes et vacance locative." },
  { q: "Leasehold ou PT PMA — quelle structure un investisseur étranger doit-il choisir ?",
    a: "Le leasehold (bail foncier de long terme, 25-80 ans) convient à l'achat de 1-2 biens individuels. Moins cher, plus rapide (1-2 mois), sans structure d'entreprise. La PT PMA (société indonésienne à actionnariat étranger) a du sens pour un portefeuille de 3 unités et plus ou pour de l'immobilier commercial. Elle permet la pleine propriété (freehold) mais exige 25 000 $ de capital libéré, un reporting annuel et un impôt sur les sociétés." },
  { q: "Quelles taxes un étranger paie-t-il lors de l'achat et de la détention d'un bien à Bali ?",
    a: "À l'achat : taxe d'acquisition de 5 % (BPHTB) + 1-2 % de notaire + 3-5 % de commission d'agent le cas échéant. À la détention : PBB (taxe foncière) de 0,1-0,3 % de la valeur cadastrale par an. Sur les revenus locatifs : 20 % d'impôt sur le revenu pour les étrangers (réductible via une PT PMA). À la revente : 2,5 % d'impôt sur le prix de vente." },
  { q: "En combien d'années une villa à Bali est-elle amortie ?",
    a: "À 10 % de rendement annuel — 10 ans. À 12 % — 8,3 ans. En pratique : 7-10 ans à Canggu/Bukit avec une gestion active ; 12-15 ans dans les quartiers plus calmes. Attention aux leaseholds de moins de 30 ans restants à l'achat — ils ne bouclent souvent pas un cycle d'amortissement complet suivi d'une revente rentable." },
  { q: 'Que sont le PBG et le SLF, et pourquoi sont-ils essentiels ?',
    a: "Le PBG (Persetujuan Bangunan Gedung) est le permis de construire, délivré avant la construction. Le SLF (Sertifikat Laik Fungsi) est le certificat d'aptitude à l'usage, délivré à l'achèvement. Sans SLF, le bien ne peut légalement être loué — votre modèle d'investissement ne fonctionne pas officiellement. Chaque bien du catalogue Balinsky fait l'objet d'un contrôle qualité de ces documents avant publication — c'est ce qui fait de nous une sélection éditoriale, et non un agrégateur." },
  { q: "Puis-je obtenir un permis de séjour indonésien via un investissement immobilier ?",
    a: "Il n'existe pas de dispositif direct « bien contre résidence ». Il y a le KITAS Investor Visa (à partir de 40 000 $ investis dans une PT PMA), le Second Home Visa (à partir de 130 000 $ déposés dans une banque indonésienne), le Golden Visa (à partir de 350 000 $ d'investissement individuel, 25 M$ pour les sociétés). L'achat d'une villa seul ne donne pas droit à la résidence — il faut une structure de société ou de dépôt." },
]

const REGIONS = [
  { name: 'Canggu', slug: 'canggu', yieldRange: '10-13%', priceFrom: '$180K', niche: 'quartier tendance, événements, networking, locations à la journée' },
  { name: 'Bukit (Uluwatu/Pandawa/Ungasan)', slug: 'uluwatu', yieldRange: '10-15%', priceFrom: '$130K', niche: "vues premium sur l'océan, communauté surf, ADR élevé" },
  { name: 'Ubud', slug: 'ubud', yieldRange: '6-9%', priceFrom: '$120K', niche: 'bien-être, tourisme yoga, séjours prolongés' },
  { name: 'Sanur', slug: 'sanur', yieldRange: '5-8%', priceFrom: '$150K', niche: 'segment familial, faible risque, demande stable' },
  { name: 'Nusa Dua', slug: 'nusa-dua', yieldRange: '7-10%', priceFrom: '$200K', niche: 'hôtels premium à proximité, voyages d’affaires' },
  { name: 'Pererenan', slug: 'pererenan', yieldRange: '9-12%', priceFrom: '$160K', niche: 'attenant à Canggu mais plus calme, zone tendance en croissance' },
]

export const revalidate = 86400

export default function Page() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/fr` },
      { '@type': 'ListItem', position: 2, name: "Investir dans l'immobilier à Bali", item: `${SITE_URL}/fr/investissement-immobilier-bali` },
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
          { label: 'Accueil', href: '/fr' },
          { label: "Investir dans l'immobilier à Bali" },
        ]} />

        <article className="mt-6 mb-16 max-w-4xl">
          <header className="mb-10">
            <h1 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#111827] mb-4 leading-tight">
              Investir dans l&apos;immobilier à Bali — Guide 2026
            </h1>
            <p className="text-[18px] text-[var(--color-text-muted)] leading-relaxed">
              Rendements nets annuels réels de 8-15 %, décomposition du ROI sur 6 quartiers, structures juridiques (leasehold et PT PMA),
              taxes pour les propriétaires étrangers, et une sélection éditoriale de biens aux permis vérifiés.
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-3">Mis à jour : {UPDATED}</p>
          </header>

          <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: TrendingUp, n: '8–15%', label: 'rendement net annuel' },
              { Icon: Building2, n: '828+', label: 'biens au catalogue' },
              { Icon: ShieldCheck, n: '100%', label: 'PBG + SLF vérifiés' },
              { Icon: BarChart3, n: '6', label: "quartiers d'investissement" },
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
              Pourquoi Bali est le marché n°1 pour les investisseurs étrangers en 2026
            </h2>
            <div className="space-y-4 text-[16px] leading-[1.7] text-[#1f2937]">
              <p>
                Bali est le seul marché touristique d&apos;Asie du Sud-Est où un étranger peut détenir légalement un bien
                malgré l&apos;interdiction de la pleine propriété pour les étrangers en Indonésie. Grâce aux structures leasehold et PT PMA, les transactions
                se concluent vite et proprement, et les taux d&apos;imposition sont parmi les plus bas de la région.
              </p>
              <p>
                En parallèle, l&apos;île conserve sa position de poids lourd touristique régional : 6-7 millions de visiteurs
                internationaux par an, 70-85 % d&apos;occupation dans les hôtels et locations de Canggu et Bukit, un tarif moyen journalier (ADR) en hausse
                de 8-12 % d&apos;une année sur l&apos;autre depuis 2023. D&apos;après <a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a> —
                les analytiques Booking publiques que nous affichons dans chaque fiche de bien — des données de rendement réelles au niveau du voisinage sont disponibles
                littéralement rue par rue dans un rayon de 1 km.
              </p>
              <p>
                C&apos;est la combinaison rare : <strong>forte demande touristique + structures légales favorables aux étrangers + faible coût d&apos;entrée</strong>
                (120-200 K$ pour un premier bien). Aucun autre marché d&apos;Asie du Sud-Est ne réunit les trois — Phuket et Hô Chi Minh
                sont plus chers et plus compliqués sur les transactions, Samui et Langkawi ont une demande plus faible.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Rendements par quartier — chiffres réels 2026
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-6">
              Ces fourchettes moyennent des voisins Booking comparables sur les 12 derniers mois, nets de frais de gestion,
              d&apos;amortissement et de taxes. Écart présenté entre le 5e et le 95e centile.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="text-left text-[var(--color-text-muted)] uppercase tracking-wide text-[12px]">
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Quartier</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">Rendement</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)]">À partir de</th>
                    <th className="py-3 px-3 border-b border-[var(--color-border)] hidden md:table-cell">Caractère</th>
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
                        <Link href={`/fr/villas`} className="text-[var(--color-primary)] text-[13px] inline-flex items-center gap-1 no-underline hover:underline">
                          parcourir <ChevronRight size={14} />
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
              Structures juridiques — Leasehold vs PT PMA
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">Leasehold</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Bail foncier de long terme auprès d&apos;un propriétaire local — 25-80 ans, souvent renouvelable.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Paperasse et formalités minimales</li>
                  <li>Se conclut en 1-2 mois chez un notaire PPAT</li>
                  <li>Convient à 1-2 achats individuels</li>
                  <li>Moins cher qu&apos;une PT PMA de 5-15 K$ par opération</li>
                  <li className="text-[var(--color-text-muted)]">Vous ne possédez pas le terrain — seulement le droit d&apos;usage</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
                <h3 className="text-[18px] font-semibold text-[#111827] mb-2">PT PMA</h3>
                <p className="text-[14px] text-[var(--color-text-muted)] mb-3">Société indonésienne à actionnariat étranger — peut détenir un terrain en freehold.</p>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li>Pleine propriété (freehold)</li>
                  <li>Convient à un portefeuille de 3 unités et plus</li>
                  <li>Permet une exploitation locative légale</li>
                  <li>25 K$ de capital libéré + reporting annuel</li>
                  <li className="text-[var(--color-text-muted)]">22 % d&apos;impôt sur les sociétés</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
              Guide complet de la transaction sur la page <Link href="/fr/comment-acheter" className="text-[var(--color-primary)] no-underline hover:underline">« Comment acheter un bien à Bali »</Link>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Calcul du ROI — cas type
            </h2>
            <div className="rounded-2xl border border-[var(--color-border)] p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-[var(--color-primary)]" />
                <strong>Villa 2 chambres à Canggu, 250 K$, leasehold de 30 ans</strong>
              </div>
              <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                <li>Prix d&apos;achat : 250 000 $</li>
                <li>Frais de transaction (notaire, taxe BPHTB, due diligence) : ~15 000 $</li>
                <li>Tarif moyen : 200 $/nuit × 75 % d&apos;occupation × 365 jours = 54 750 $/an</li>
                <li>Dépenses (gestion 18 %, charges, amortissement du mobilier, taxe de 20 %) : ~23 500 $/an</li>
                <li>Cash-flow net : ~31 250 $/an → 12,5 % de rendement annuel sur la mise de 250 K$</li>
                <li>Amortissement : ~8 ans pour rentrer dans ses frais, 22 années locatives utiles restantes sur le bail</li>
              </ul>
              <p className="mt-4 text-[14px] text-[var(--color-text-muted)]">
                Un calculateur similaire s&apos;exécute automatiquement sur chaque page de villa de notre catalogue, alimenté par des données réelles
                du voisinage issues d&apos;<a href="https://www.estatemarket.io" target="_blank" rel="nofollow noopener noreferrer" className="text-[var(--color-primary)]">estatemarket.io</a>.
              </p>
            </div>
          </section>

          <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Les risques dont les vendeurs ne parlent pas</h3>
                <ul className="space-y-2 text-[14px] text-[#1f2937] list-disc pl-5">
                  <li><strong>Leasehold de moins de 30 ans.</strong> Vous ne récupérerez pas votre investissement tout en revendant avec profit. Exigez au moins 35 ans restants à l&apos;achat.</li>
                  <li><strong>Bien sans SLF.</strong> La location légale est impossible — votre modèle de rendement n&apos;existe pas sur le papier.</li>
                  <li><strong>Promoteur sans PBG.</strong> La construction peut être stoppée par les autorités et votre acompte ne sera pas remboursé.</li>
                  <li><strong>Terrain en zone agricole.</strong> Certaines parcelles de Canggu/Pererenan sont en cours de reclassement — vérifiez le plan RDTR.</li>
                  <li><strong>Occupation réelle inférieure aux promesses.</strong> Les rendements garantis par les promoteurs sont généralement gonflés de 30-50 %. Recoupez avec les données des voisins Booking.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Comment nous vérifions les biens du catalogue
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#1f2937] mb-4">
              Chaque bien chez Balinsky passe un contrôle qualité éditorial avant publication. Ce n&apos;est pas un agrégateur fourre-tout —
              seulement des projets dont les permis (PBG, SLF), la structure foncière (zonage, RDTR) et le promoteur (enregistrement PT) ont été
              vérifiés à la main.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <FileCheck2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Documents</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">PBG, SLF, IMB, AJB / acte notarié — vérifiés dans les registres du ministère ATR/BPN.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <Building2 size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Promoteur</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Enregistrement PT, portefeuille de projets livrés, réputation dans la communauté locale des agents.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] p-4 bg-white">
                <MapPin size={20} className="text-[var(--color-primary)] mb-2" />
                <h3 className="text-[14px] font-semibold text-[#111827] mb-1">Emplacement</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Visite du site sur place, photo et vidéo depuis le terrain, contrôle des infrastructures dans un rayon de 500 m.</p>
              </div>
            </div>
            <div className="mt-6 text-[14px]">
              Plus d&apos;infos sur <Link href="/fr/a-propos" className="text-[var(--color-primary)] no-underline hover:underline">« À propos de Balinsky »</Link>.
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              Prochaines étapes
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/fr/villas" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Catalogue de villas</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Chaque villa avec photos, prix, permis et calculs de ROI.</p>
              </Link>
              <Link href="/fr/appartements" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Catalogue d&apos;appartements</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Des biens dans des complexes gérés — le seuil d&apos;entrée le plus bas.</p>
              </Link>
              <Link href="/fr/residences" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Complexes résidentiels</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Complexes sur plan et prêts avec gestion, rendus 3D et dates de livraison.</p>
              </Link>
              <Link href="/fr/comment-acheter" className="block rounded-2xl border border-[var(--color-border)] p-5 bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-1">Comment acheter — étape par étape</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">Les sept étapes de la transaction, les structures de propriété, les coûts réels et les pièges.</p>
              </Link>
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
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </PageContainer>
      <Footer lang="fr" />
    </>
  )
}
