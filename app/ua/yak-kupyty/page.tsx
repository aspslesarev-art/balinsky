import type { Metadata } from 'next'
import { BuyingGuide } from '@/components/BuyingGuide'
import { hreflangMap } from '@/lib/hreflang'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Купівля нерухомості на Балі іноземцем — посібник | Balinsky',
  description: 'Покроковий посібник із купівлі вілли чи апартаментів на Балі: leasehold і PT PMA, due diligence, нотаріус PPAT, податки та збори, типові помилки. Реальні терміни та цифри.',
  alternates: {
    canonical: '/ua/yak-kupyty',
    languages: hreflangMap('/ru/kak-kupit'),
  },
  openGraph: {
    title: 'Купівля нерухомості на Балі іноземцем',
    description: 'Сім кроків, форми власності, реальні сукупні витрати та FAQ. Посібник Balinsky.',
    url: `${SITE_URL}/ua/yak-kupyty`,
    type: 'article',
  },
}

export default function Page() {
  return <BuyingGuide lang="uk" />
}
