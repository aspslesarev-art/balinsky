import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: 'Balinsky — AI search for Bali real estate and Southeast Asia',
  description:
    'An AI broker that knows every villa, apartment and complex on Bali. Search in English, Russian or Indonesian. Shortlist, evaluate and close — in one platform.',
  alternates: {
    canonical: '/en',
    languages: { ru: '/ru', en: '/en', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Balinsky — AI search for Bali real estate',
    description: 'Every property on the island in a single AI system. From the first question to signing the deal.',
    type: 'website',
    url: '/en',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Balinsky — AI search for Bali real estate',
    description: 'Every property on the island in a single AI system.',
    images: ['/balina.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="en" />
}
