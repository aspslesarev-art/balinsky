import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'
import { hreflangMap } from '@/lib/hreflang'


export const metadata: Metadata = {
  title: 'Bandingkan properti Bali — daftar pilihan | Balinsky',
  description: 'Daftar pilihan dan perbandingan berdampingan vila, apartemen, dan kompleks hunian Bali — harga, luas, leasehold, izin, dan imbal hasil yang diklaim dalam satu tabel.',
  alternates: {
    canonical: '/id/favorit',
    languages: hreflangMap('/ru/izbrannoe'),
  },
}

export default function Page() {
  return <ShortlistView lang="id" />
}
