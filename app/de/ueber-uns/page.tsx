import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Über Balinsky — wer wir sind und warum Sie uns vertrauen können | Balinsky',
  description: 'Balinsky ist ein Bali-Immobilienkatalog für ausländische Käufer: geprüfte Dokumente, Videos vor Ort, echte Manager mit Fotos und gesprochenen Sprachen. Aktuelle Zahlen, wer die Website betreibt, unsere redaktionellen Standards.',
  alternates: {
    canonical: '/de/ueber-uns',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: 'Über Balinsky',
    description: 'Bali-Immobilienkatalog für ausländische Käufer — geprüfte Dokumente, Videos vor Ort, echte Manager.',
    url: `${SITE_URL}/de/ueber-uns`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="de" />
}
