import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Bali Property Prices & Rental Data — Compare Before You Buy | Balinsky',
  description: 'Villas and apartments from dozens of developers, checked against thousands of Bali holiday rentals: price per m² vs the district, nearby rental rates, lease term and permit status. Free, no sign-up.',
  alternates: {
    canonical: '/ban',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Bali Property Prices & Rental Data — Compare Before You Buy',
    description: 'Villas and apartments from dozens of developers, checked against thousands of Bali holiday rentals: price per m² vs the district, nearby rental rates, lease term and permit status. Free, no sign-up.',
    type: 'website',
    url: '/ban',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bali property, in numbers',
    description: 'Price per m² vs the district, nearby rental rates, lease term and permit status — compare before you buy.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="ban" />
}
