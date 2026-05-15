import { HomePageContent } from '@/components/HomePageContent'

export const revalidate = 1800

export const metadata = {
  title: 'Balinsky — Bali real estate: villas, apartments, residential complexes',
  description:
    'Bali real-estate catalog with photos, prices and filters. Villas, apartments, residential complexes and verified developers. Fresh news, promotions and events.',
  alternates: {
    canonical: '/en',
    languages: { ru: '/ru', en: '/en' , 'x-default': '/ru'},
  },
  openGraph: {
    title: 'Balinsky — Bali real estate',
    description: 'Villas, apartments and residential complexes in Bali. Verified developers.',
    type: 'website',
    url: '/en',
  },
}

export default function EnHome() {
  return <HomePageContent lang="en" />
}
