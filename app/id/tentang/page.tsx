import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Tentang Balinsky — siapa kami dan mengapa Anda bisa memercayai kami | Balinsky',
  description: 'Balinsky adalah katalog properti Bali untuk pembeli asing: dokumen terverifikasi, video langsung di lapangan, manajer nyata dengan foto dan bahasa yang dikuasai. Angka terkini, siapa yang menjalankan situs, standar editorial kami.',
  alternates: {
    canonical: '/id/tentang',
    languages: { ru: `${SITE_URL}/ru/o-balinsky`, en: `${SITE_URL}/en/about`, id: `${SITE_URL}/id/tentang`, 'x-default': `${SITE_URL}/ru/o-balinsky`},
  },
  openGraph: {
    title: 'Tentang Balinsky',
    description: 'Katalog properti Bali untuk pembeli asing — dokumen terverifikasi, video langsung di lapangan, manajer nyata.',
    url: `${SITE_URL}/id/tentang`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="id" />
}
