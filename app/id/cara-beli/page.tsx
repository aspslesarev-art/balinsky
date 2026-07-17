import type { Metadata } from 'next'
import { BuyingGuide } from '@/components/BuyingGuide'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Membeli properti di Bali sebagai orang asing — panduan | Balinsky',
  description: 'Panduan langkah demi langkah membeli vila atau apartemen di Bali: leasehold dan PT PMA, uji tuntas, notaris PPAT, pajak dan biaya, kesalahan umum. Jangka waktu dan angka yang nyata.',
  alternates: {
    canonical: '/id/cara-beli',
    languages: { ru: `${SITE_URL}/ru/kak-kupit`, en: `${SITE_URL}/en/how-to-buy`, id: `${SITE_URL}/id/cara-beli`, 'x-default': `${SITE_URL}/ru/kak-kupit`},
  },
  openGraph: {
    title: 'Membeli properti di Bali sebagai orang asing',
    description: 'Tujuh langkah, struktur kepemilikan, total biaya sebenarnya, dan FAQ. Panduan Balinsky.',
    url: `${SITE_URL}/id/cara-beli`,
    type: 'article',
  },
}

export default function Page() {
  return <BuyingGuide lang="id" />
}
