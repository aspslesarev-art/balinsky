import { PriceIndexView, priceIndexMetadata } from '@/components/market/PriceIndexView'

export const revalidate = 86400

export const metadata = priceIndexMetadata('zh')

export default function Page() {
  return <PriceIndexView lang="zh" />
}
