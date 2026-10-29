import { PriceIndexView, priceIndexMetadata } from '@/components/market/PriceIndexView'

export const revalidate = 604800

export const metadata = priceIndexMetadata('nl')

export default function Page() {
  return <PriceIndexView lang="nl" />
}
