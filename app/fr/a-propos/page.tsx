import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'À propos de Balinsky — ce que nous sommes et comment nous travaillons | Balinsky',
  description: 'Balinsky est un site de données immobilières sur Bali : prix face au quartier, loyers voisins, durée des baux. Ce que nous vérifions ou non, d’où viennent les chiffres, comment nous corrigeons les erreurs.',
  alternates: {
    canonical: '/fr/a-propos',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: 'À propos de Balinsky',
    description: 'Données immobilières sur Bali : ce que nous vérifions, d’où viennent les chiffres.',
    url: `${SITE_URL}/fr/a-propos`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="fr" />
}
