import type { Metadata } from 'next'
import { ShortlistView } from '@/components/ShortlistView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Порівняйте нерухомість Балі — обране | Balinsky',
  description: 'Обране та порівняння пліч-о-пліч вілл, апартаментів і житлових комплексів Балі — ціна, площа, leasehold, дозволи та заявлена дохідність в одній таблиці.',
  alternates: {
    canonical: '/ua/obrane',
    languages: { ru: `${SITE_URL}/ru/izbrannoe`, en: `${SITE_URL}/ua/obrane` , 'x-default': `${SITE_URL}/ru/izbrannoe`},
  },
}

export default function Page() {
  return <ShortlistView lang="uk" />
}
