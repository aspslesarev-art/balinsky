import type { Metadata } from 'next'
import { ReservationGuide } from '@/components/ReservationGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Cara kerja reservasi properti Bali | Balinsky',
  description: 'Apa arti "reservasi" di Bali: penahanan 14 hari, deposit penahanan $2–10k, di mana deposit disimpan, cara pengembalian dana, formulir reservasi vs SPA.',
  alternates: {
    canonical: '/id/reservasi',
    languages: { ru: `${SITE_URL}/ru/rezervirovanie`, en: `${SITE_URL}/en/reservation`, id: `${SITE_URL}/id/reservasi`, 'x-default': `${SITE_URL}/ru/rezervirovanie`},
  },
  openGraph: {
    title: 'Cara kerja reservasi properti Bali',
    description: 'Penahanan eksklusif 14 hari, deposit $2–10k, pengembalian dana yang jelas — cara kerja reservasi di Balinsky.',
    url: `${SITE_URL}/id/reservasi`,
    type: 'article',
  },
}

export default function Page() {
  return <ReservationGuide lang="id" />
}
