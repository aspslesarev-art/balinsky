import { HomeJournal } from '@/components/HomeJournal'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 3600

export const metadata = {
  title: 'Нерухомість на Балі для іноземців — вілли та апартаменти в лізхолді | Balinsky',
  description: 'Маркетплейс нерухомості Балі для іноземців: вілли та апартаменти в лізхолді від забудовників. Ціна, строк оренди землі, документи й дохід по кожному об’єкту.',
  alternates: {
    canonical: '/ua',
    languages: hreflangMap('/ru'),
  },
  openGraph: {
    title: 'Нерухомість на Балі для іноземців — усе в лізхолді',
    description: 'Маркетплейс нерухомості Балі для іноземців: вілли та апартаменти в лізхолді від забудовників. Ціна, строк оренди землі, документи й дохід по кожному об’єкту.',
    type: 'website',
    url: '/ua',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Нерухомість на Балі для іноземців — усе в лізхолді',
    description: 'Вілли та апартаменти в лізхолді: ціна, строк оренди землі, документи й дохід по кожному об’єкту.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeJournal lang="uk" />
}
