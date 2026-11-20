import { HomeJournal } from '@/components/HomeJournal'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Immobilier à Bali pour étrangers — villas et appartements en leasehold | Balinsky',
  description: 'La place de marché immobilière de Bali pour les étrangers : villas et appartements en leasehold auprès des promoteurs. Prix, durée du bail, documents et revenus pour chaque bien.',
  alternates: {
    canonical: '/fr',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Immobilier à Bali pour étrangers — tout en leasehold',
    description: 'La place de marché immobilière de Bali pour les étrangers : villas et appartements en leasehold auprès des promoteurs. Prix, durée du bail, documents et revenus pour chaque bien.',
    type: 'website',
    url: '/fr',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Immobilier à Bali pour étrangers — tout en leasehold',
    description: 'Villas et appartements en leasehold : prix, durée du bail, documents et revenus pour chaque bien.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeJournal lang="fr" />
}
