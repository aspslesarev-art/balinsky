import { loadPodborPool } from '@/lib/home-collections'
import { PodborWizard } from '@/components/PodborWizard'
import { hreflangMap } from '@/lib/hreflang'

export const revalidate = 1800

export const metadata = {
  title: 'Подбор недвижимости на Бали за 2 шага — инвестиции или жильё для семьи | Balinsky',
  description:
    'Простой подбор: выберите цель (инвестиции или жильё для семьи) и бюджет — покажем лучшие виллы и апартаменты на Бали. Реальные цены, фото, доходность соседей на странице объекта.',
  alternates: {
    canonical: '/ru/podbor',
    languages: hreflangMap('/ru/podbor'),
  },
  openGraph: {
    title: 'Подбор недвижимости на Бали за 2 шага',
    description: 'Инвестиции или жильё для семьи → бюджет → 3 лучших варианта. Просто и быстро.',
    type: 'website',
    url: '/ru/podbor',
  },
}

export default async function PodborPage() {
  const items = await loadPodborPool('ru')
  return <PodborWizard items={items} lang="ru" />
}
