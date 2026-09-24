// Investing in <district> — content and figures live in components/InvestmentDistrict
// (one source for all ten locales; district figures from lib/district-market.json).
import { notFound } from 'next/navigation'
import { InvestmentDistrict, investmentDistrictMetadata } from '@/components/InvestmentDistrict'
import { getDistrictCopy } from '@/lib/districts'

type Params = Promise<{ district: string }>

export const revalidate = 86400

export async function generateMetadata({ params }: { params: Params }) {
  const { district } = await params
  return investmentDistrictMetadata(district, 'zh')
}

export default async function Page({ params }: { params: Params }) {
  const { district } = await params
  const copy = getDistrictCopy(district, 'zh')
  if (!copy) notFound()
  return <InvestmentDistrict slug={district} lang="zh" copy={copy} />
}
