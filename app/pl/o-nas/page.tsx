import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'O Balinsky — czym jesteśmy i dlaczego można nam zaufać | Balinsky',
  description: 'Balinsky to katalog nieruchomości na Bali dla zagranicznych kupujących: zweryfikowane dokumenty, wideo z miejsca, prawdziwi menedżerowie ze zdjęciami i językami, którymi się posługują. Aktualne liczby, kto prowadzi serwis, nasze standardy redakcyjne.',
  alternates: {
    canonical: '/pl/o-nas',
    languages: { ru: `${SITE_URL}/ru/o-balinsky`, en: `${SITE_URL}/pl/o-nas` , 'x-default': `${SITE_URL}/ru/o-balinsky`},
  },
  openGraph: {
    title: 'O Balinsky',
    description: 'Katalog nieruchomości na Bali dla zagranicznych kupujących — zweryfikowane dokumenty, wideo z miejsca, prawdziwi menedżerowie.',
    url: `${SITE_URL}/pl/o-nas`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="pl" />
}
