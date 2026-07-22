import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: 'Immobilien auf Bali kaufen — unabhängiger Marktplatz mit Analytik | Balinsky',
  description:
    'Villen, Apartments und Anlagen von Dutzenden Bauträgern in einem Katalog. Geprüfte Dokumente (PBG, SLF) und reale Mietrendite aus Nachbarschaftsdaten. Fotos, aktuelle Preise, Kontakte — Ihre Wahl.',
  alternates: {
    canonical: '/de',
    languages: { ru: '/ru', en: '/en', de: '/de', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Immobilien auf Bali kaufen — unabhängiger Marktplatz mit Analytik',
    description: 'Villen, Apartments und Anlagen von Dutzenden Bauträgern. Geprüfte Dokumente und reale Mietrendite aus Nachbarschaftsdaten — die Wahl und die Zahlen sprechen für Sie.',
    type: 'website',
    url: '/de',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Immobilien auf Bali kaufen — Marktplatz mit Analytik',
    description: 'Villen, Apartments und Anlagen von Dutzenden Bauträgern mit geprüften Dokumenten und realer Mietrendite.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="de" />
}
