// Investing in <district> — content and figures live in components/InvestmentDistrict
// (one source for all ten locales; district figures from lib/district-market.json).
import { notFound } from 'next/navigation'
import { InvestmentDistrict, investmentDistrictMetadata } from '@/components/InvestmentDistrict'
import { getDistrictCopy } from '@/lib/districts'
import { districtParams } from '@/lib/static-params'

type Params = Promise<{ district: string }>

export const revalidate = 86400

export const generateStaticParams = districtParams

export async function generateMetadata({ params }: { params: Params }) {
  const { district } = await params
  return investmentDistrictMetadata(district, 'ru')
}

export default async function Page({ params }: { params: Params }) {
  const { district } = await params
  const copy = getDistrictCopy(district, 'ru')
  if (!copy) notFound()
  return <InvestmentDistrict slug={district} lang="ru" copy={copy} />
}
