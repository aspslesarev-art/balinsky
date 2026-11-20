import { HomeJournal } from '@/components/HomeJournal'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Properti Bali untuk Warga Asing — Vila & Apartemen Leasehold | Balinsky',
  description: 'Marketplace properti Bali untuk warga asing: vila dan apartemen leasehold dari pengembang. Harga, masa sewa tanah, dokumen, dan pendapatan untuk setiap properti.',
  alternates: {
    canonical: '/id',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Properti Bali untuk warga asing — semuanya leasehold',
    description: 'Marketplace properti Bali untuk warga asing: vila dan apartemen leasehold dari pengembang. Harga, masa sewa tanah, dokumen, dan pendapatan untuk setiap properti.',
    type: 'website',
    url: '/id',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Properti Bali untuk warga asing — semuanya leasehold',
    description: 'Vila dan apartemen leasehold: harga, masa sewa tanah, dokumen, dan pendapatan untuk setiap properti.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeJournal lang="id" />
}
