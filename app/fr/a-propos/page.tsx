import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'À propos de Balinsky — qui nous sommes et pourquoi nous faire confiance | Balinsky',
  description: 'Balinsky est un catalogue immobilier de Bali pour acheteurs étrangers : documents vérifiés, vidéos sur le terrain, vrais responsables avec photos et langues parlées. Chiffres en direct, qui gère le site, nos standards éditoriaux.',
  alternates: {
    canonical: '/fr/a-propos',
    languages: { ru: `${SITE_URL}/ru/o-balinsky`, en: `${SITE_URL}/en/about`, fr: `${SITE_URL}/fr/a-propos` , 'x-default': `${SITE_URL}/ru/o-balinsky`},
  },
  openGraph: {
    title: 'À propos de Balinsky',
    description: 'Catalogue immobilier de Bali pour acheteurs étrangers — documents vérifiés, vidéos sur le terrain, responsables en chair et en os.',
    url: `${SITE_URL}/fr/a-propos`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="fr" />
}
