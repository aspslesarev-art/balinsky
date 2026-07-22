import { HomeLanding } from '@/components/HomeLanding'

export const revalidate = 1800

export const metadata = {
  title: 'Купівля нерухомості на Балі — незалежний маркетплейс з аналітикою | Balinsky',
  description:
    'Вілли, апартаменти та комплекси від десятків забудовників в одному каталозі. Перевірені документи (PBG, SLF) і реальна дохідність від оренди на основі даних сусідніх обʼєктів. Фото, актуальні ціни, контакти — вибір за вами.',
  alternates: {
    canonical: '/uk',
    languages: { ru: '/ru', uk: '/uk', 'x-default': '/ru' },
  },
  openGraph: {
    title: 'Купівля нерухомості на Балі — незалежний маркетплейс з аналітикою',
    description: 'Вілли, апартаменти та комплекси від десятків забудовників. Перевірені документи і реальна дохідність від оренди на основі даних сусідніх обʼєктів — вибір і цифри на вашому боці.',
    type: 'website',
    url: '/uk',
    images: [{ url: '/andrei.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Купівля нерухомості на Балі — маркетплейс з аналітикою',
    description: 'Вілли, апартаменти та комплекси від десятків забудовників з перевіреними документами та реальною дохідністю від оренди.',
    images: ['/andrei.jpg'],
  },
}

export default function EnHome() {
  return <HomeLanding lang="uk" />
}
