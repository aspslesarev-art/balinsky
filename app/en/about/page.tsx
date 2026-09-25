import type { Metadata } from 'next'
import { AboutView } from '@/components/AboutView'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'About Balinsky — what we are and how we work | Balinsky',
  description: 'Balinsky is a Bali property data site: prices vs the district, nearby rental rates, lease terms. What we check and what we don’t, where the numbers come from, how we correct errors.',
  alternates: {
    canonical: '/en/about',
    languages: hreflangMap('/ru/o-balinsky'),
  },
  openGraph: {
    title: 'About Balinsky',
    description: 'Bali property data: what we check, where the numbers come from, how we correct errors.',
    url: `${SITE_URL}/en/about`,
    type: 'article',
  },
}

export default function Page() {
  return <AboutView lang="en" />
}
