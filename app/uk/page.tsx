import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: 'Buy real estate in Bali — independent marketplace with analytics | Balinsky',
  description:
    'Villas, apartments and complexes from dozens of developers in one catalog. Verified documents (PBG, SLF) and real rental yield from neighbour data. Photos, current prices, contacts — your choice.',
  alternates: {
    canonical: '/uk',
    languages: { ru: '/ru', uk: '/uk', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Buy real estate in Bali — independent marketplace with analytics',
    description: 'Villas, apartments and complexes from dozens of developers. Verified documents and real rental yield from neighbour data — the choice and the numbers are on your side.',
    type: 'website',
    url: '/uk',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy real estate in Bali — marketplace with analytics',
    description: 'Villas, apartments and complexes from dozens of developers with verified documents and real rental yield.',
    images: ['/balina.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="uk" />
}
