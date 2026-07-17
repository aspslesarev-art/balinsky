import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Bandingkan properti Bali — daftar pilihan | Balinsky',
  description: 'Daftar pilihan dan perbandingan berdampingan vila, apartemen, dan kompleks hunian Bali — harga, luas, leasehold, izin, dan imbal hasil yang diklaim dalam satu tabel.',
  alternates: {
    canonical: '/id/favorit',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/en/favourites`, id: `${SITE_URL}/id/favorit`, 'x-default': `${SITE_URL}/ru/izbrannoe`},
  },
}

export default function Page() {
  return <ShortlistView lang="id" />
}
