import { HomeLanding } from '@/components/HomeLanding'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 1800

export const metadata = {
  title: 'Beli properti di Bali — marketplace independen dengan analitik | Balinsky',
  description:
    'Vila, apartemen, dan kompleks dari puluhan pengembang dalam satu katalog. Dokumen terverifikasi (PBG, SLF) dan imbal hasil sewa nyata dari data tetangga. Foto, harga terkini, kontak — pilihan ada di tangan Anda.',
  alternates: {
    canonical: '/id',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Beli properti di Bali — marketplace independen dengan analitik',
    description: 'Vila, apartemen, dan kompleks dari puluhan pengembang. Dokumen terverifikasi dan imbal hasil sewa nyata dari data tetangga — pilihan dan angkanya ada di pihak Anda.',
    type: 'website',
    url: '/id',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beli properti di Bali — marketplace dengan analitik',
    description: 'Vila, apartemen, dan kompleks dari puluhan pengembang dengan dokumen terverifikasi dan imbal hasil sewa nyata.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="id" />
}
