import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'
import { hreflangMap } from '@/lib/hreflang'


export const metadata: Metadata = {
  title: 'Сравнение объектов недвижимости на Бали | Balinsky',
  description: 'Шортлист и таблица сравнения вилл, апартаментов и жилых комплексов на Бали — цена, метраж, лизхолд, разрешения и заявленная доходность в одном месте.',
  alternates: {
    canonical: '/ru/izbrannoe',
    languages: hreflangMap('/ru/izbrannoe'),
  },
}

export default function Page() {
  return <ShortlistView lang="ru" />
}
