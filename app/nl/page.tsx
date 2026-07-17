import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: 'Vastgoed kopen op Bali — onafhankelijke marktplaats met analyses | Balinsky',
  description:
    "Villa's, appartementen en complexen van tientallen ontwikkelaars in één catalogus. Geverifieerde documenten (PBG, SLF) en reëel huurrendement op basis van buurtdata. Foto's, actuele prijzen, contacten — de keuze is aan u.",
  alternates: {
    canonical: '/nl',
    languages: { ru: '/ru', en: '/en', nl: '/nl', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Vastgoed kopen op Bali — onafhankelijke marktplaats met analyses',
    description: "Villa's, appartementen en complexen van tientallen ontwikkelaars. Geverifieerde documenten en reëel huurrendement op basis van buurtdata — de keuze en de cijfers staan aan uw kant.",
    type: 'website',
    url: '/nl',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vastgoed kopen op Bali — marktplaats met analyses',
    description: "Villa's, appartementen en complexen van tientallen ontwikkelaars met geverifieerde documenten en reëel huurrendement.",
    images: ['/balina.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="nl" />
}
