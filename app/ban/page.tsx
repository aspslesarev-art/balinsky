import { HomeJournal } from '@/components/HomeJournal'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Properti Bali majeng Wong Dura Negara — Vila lan Apartemen Leasehold | Balinsky',
  description: 'Pasar properti Bali majeng wong dura negara: vila lan apartemen leasehold saking pangwangun. Aji, suen sewa tanah, dokumen, lan pikolih sabilang properti.',
  alternates: {
    canonical: '/ban',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Properti Bali majeng wong dura negara — sami leasehold',
    description: 'Pasar properti Bali majeng wong dura negara: vila lan apartemen leasehold saking pangwangun. Aji, suen sewa tanah, dokumen, lan pikolih sabilang properti.',
    type: 'website',
    url: '/ban',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Properti Bali majeng wong dura negara — sami leasehold',
    description: 'Vila lan apartemen leasehold: aji, suen sewa tanah, dokumen, lan pikolih sabilang properti.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeJournal lang="ban" />
}
