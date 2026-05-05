import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CompareView } from '@/components/CompareView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Compare listings | Balinsky',
  description: 'Side-by-side comparison of saved villas, apartments and complexes in Bali.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/en/compare',
    languages: { ru: `${SITE_URL}/ru/sravnenie`, en: `${SITE_URL}/en/compare` },
  },
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompareView lang="en" />
    </Suspense>
  )
}
