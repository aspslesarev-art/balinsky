import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'
import { hreflangMap } from '@/lib/hreflang'


export const metadata: Metadata = {
  title: 'Порівняйте нерухомість Балі — обране | Balinsky',
  description: 'Обране та порівняння пліч-о-пліч вілл, апартаментів і житлових комплексів Балі — ціна, площа, leasehold, дозволи та заявлена дохідність в одній таблиці.',
  alternates: {
    canonical: '/ua/obrane',
    languages: hreflangMap('/ru/izbrannoe'),
  },
}

export default function Page() {
  return <ShortlistView lang="uk" />
}
