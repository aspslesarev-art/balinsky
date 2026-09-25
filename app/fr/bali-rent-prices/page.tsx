import { RentIndexView, rentIndexMetadata } from '@/components/market/RentIndexView'

export const revalidate = 86400

export const metadata = rentIndexMetadata('fr')

export default function Page() {
  return <RentIndexView lang="fr" />
}
