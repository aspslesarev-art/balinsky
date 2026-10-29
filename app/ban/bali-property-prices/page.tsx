import { PriceIndexView, priceIndexMetadata } from '@/components/market/PriceIndexView'

export const revalidate = 604800

export const metadata = priceIndexMetadata('ban')

export default function Page() {
  return <PriceIndexView lang="ban" />
}
