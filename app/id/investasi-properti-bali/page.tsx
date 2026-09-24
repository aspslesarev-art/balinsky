// Investment pillar page — content and figures live in components/InvestmentGuide
// and lib/investment-guide/ (one source for all ten locales).
import { InvestmentGuide, investmentGuideMetadata } from '@/components/InvestmentGuide'

export const revalidate = 86400
export const metadata = investmentGuideMetadata('id')

export default function Page() {
  return <InvestmentGuide lang="id" />
}
