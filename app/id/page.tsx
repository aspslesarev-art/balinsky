import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Harga Properti & Data Sewa Bali — Bandingkan Sebelum Membeli | Balinsky',
  description: 'Vila dan apartemen Bali dibandingkan dengan pasar: harga per m² vs kawasan, tarif sewa sekitar, masa leasehold, dan status izin. Gratis.',
  alternates: {
    canonical: '/id',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Harga Properti & Data Sewa Bali — Bandingkan Sebelum Membeli',
    description: 'Vila dan apartemen Bali dibandingkan dengan pasar: harga per m² vs kawasan, tarif sewa sekitar, masa leasehold, dan status izin. Gratis.',
    type: 'website',
    url: '/id',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Properti Bali dalam angka',
    description: 'Harga per m² vs kawasan, tarif sewa sekitar, masa leasehold, dan status izin — bandingkan sebelum membeli.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="id" />
}
