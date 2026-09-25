import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Prix de l\'immobilier à Bali et données locatives — comparez avant d\'acheter | Balinsky',
  description: 'Villas et appartements de dizaines de promoteurs, comparés à des milliers de locations saisonnières à Bali : prix au m² face au quartier, loyers voisins, durée du bail et statut des permis. Gratuit, sans inscription.',
  alternates: {
    canonical: '/fr',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Prix de l\'immobilier à Bali et données locatives — comparez avant d\'acheter',
    description: 'Villas et appartements de dizaines de promoteurs, comparés à des milliers de locations saisonnières à Bali : prix au m² face au quartier, loyers voisins, durée du bail et statut des permis. Gratuit, sans inscription.',
    type: 'website',
    url: '/fr',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'L\'immobilier à Bali en chiffres',
    description: 'Prix au m² face au quartier, loyers voisins, durée du bail et statut des permis — comparez avant d\'acheter.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="fr" />
}
