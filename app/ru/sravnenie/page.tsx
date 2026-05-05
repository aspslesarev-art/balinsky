import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CompareView } from '@/components/CompareView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Сравнение объектов | Balinsky',
  description: 'Сравнение сохранённых вилл, апартаментов и жилых комплексов на Бали по ключевым параметрам.',
  // Comparison is built from the visitor's localStorage; nothing for crawlers.
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/ru/sravnenie',
    languages: { ru: `${SITE_URL}/ru/sravnenie`, en: `${SITE_URL}/en/compare` },
  },
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompareView lang="ru" />
    </Suspense>
  )
}
