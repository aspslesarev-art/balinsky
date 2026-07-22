import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: 'Kup nieruchomość na Bali — niezależny marketplace z analityką | Balinsky',
  description:
    'Wille, apartamenty i kompleksy od dziesiątek deweloperów w jednym katalogu. Zweryfikowane dokumenty (PBG, SLF) i realna rentowność najmu na podstawie danych z sąsiednich obiektów. Zdjęcia, aktualne ceny, kontakty — wybór należy do Ciebie.',
  alternates: {
    canonical: '/pl',
    languages: { ru: '/ru', pl: '/pl', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Kup nieruchomość na Bali — niezależny marketplace z analityką',
    description: 'Wille, apartamenty i kompleksy od dziesiątek deweloperów. Zweryfikowane dokumenty i realna rentowność najmu na podstawie danych z sąsiednich obiektów — wybór i liczby są po Twojej stronie.',
    type: 'website',
    url: '/pl',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kup nieruchomość na Bali — marketplace z analityką',
    description: 'Wille, apartamenty i kompleksy od dziesiątek deweloperów ze zweryfikowanymi dokumentami i realną rentownością najmu.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="pl" />
}
