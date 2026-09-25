import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Tentang Balinsky — apa itu dan bagaimana kami bekerja | Balinsky',
  description: 'Balinsky adalah situs data properti Bali: harga vs kawasan, tarif sewa sekitar, masa leasehold. Apa yang kami periksa dan tidak, dari mana angkanya, bagaimana kami mengoreksi kesalahan.',
  alternates: {
    canonical: '/ban/indik',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: 'About Balinsky',
    description: 'Data properti Bali: apa yang kami periksa, sumber angka, cara koreksi.',
    url: `${SITE_URL}/ban/indik`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="ban" />
}
