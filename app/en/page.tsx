import { HomeJournal } from '@/components/HomeJournal'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Bali Property for Foreigners — Leasehold Villas & Apartments | Balinsky',
  description: 'Bali property marketplace for foreigners: leasehold villas and apartments from developers. Price, land-lease term, documents and income for every property.',
  alternates: {
    canonical: '/en',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Bali property for foreigners — everything leasehold',
    description: 'Bali property marketplace for foreigners: leasehold villas and apartments from developers. Price, land-lease term, documents and income for every property.',
    type: 'website',
    url: '/en',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bali property for foreigners — everything leasehold',
    description: 'Leasehold villas and apartments: price, land-lease term, documents and income for every property.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeJournal lang="en" />
}
