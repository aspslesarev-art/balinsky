import type { Metadata } from 'next'
import { InvestTourView } from '@/components/InvestTourView'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const metadata: Metadata = {
  title: '巴厘岛房产投资考察团 — 实地看房与尽职调查 | Balinsky',
  description: '面向境外买家的实地行程：实地考察 5–10 处房源、与开发商创始人洽谈、与专办外国人交易的律师面谈一小时、驱车游览 Canggu / Bukit / Ubud / Sanur。提供快捷、标准和高级三种方案。',
  keywords: ['Bali property tour', 'Bali real estate investment tour', 'buy villa Bali', 'Bali property foreigner', 'leasehold Bali', 'PT PMA Bali property'],
  alternates: {
    canonical: '/zh/invest-tour',
    languages: { ru: `${SITE_URL}/ru/invest-tour`, en: `${SITE_URL}/en/invest-tour`, zh: `${SITE_URL}/zh/invest-tour` , 'x-default': `${SITE_URL}/ru/invest-tour`},
  },
  openGraph: {
    title: '巴厘岛房产投资考察团',
    description: '实地看房 5–10 处、开发商会面、专办外国买家的律师、投资区域概览。由 Balinsky 提供的礼宾服务。',
    url: `${SITE_URL}/zh/invest-tour`,
    type: 'article',
  },
}

export default function Page() {
  return <InvestTourView lang="zh" />
}
