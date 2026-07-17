import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: 'Acheter un bien immobilier à Bali — marketplace indépendante avec analytique | Balinsky',
  description:
    "Villas, appartements et complexes de dizaines de promoteurs dans un seul catalogue. Documents vérifiés (PBG, SLF) et rendement locatif réel issu des données du voisinage. Photos, prix actuels, contacts — à vous de choisir.",
  alternates: {
    canonical: '/fr',
    languages: { ru: '/ru', en: '/en', fr: '/fr', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Acheter un bien immobilier à Bali — marketplace indépendante avec analytique',
    description: "Villas, appartements et complexes de dizaines de promoteurs. Documents vérifiés et rendement locatif réel issu des données du voisinage — le choix et les chiffres sont de votre côté.",
    type: 'website',
    url: '/fr',
    images: [{ url: '/balina.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Acheter un bien immobilier à Bali — marketplace avec analytique',
    description: "Villas, appartements et complexes de dizaines de promoteurs, avec documents vérifiés et rendement locatif réel.",
    images: ['/balina.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="fr" />
}
