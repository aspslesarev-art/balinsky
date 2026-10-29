import { RentIndexView, rentIndexMetadata } from '@/components/market/RentIndexView'

export const revalidate = 604800

export const metadata = rentIndexMetadata('id')

export default function Page() {
  return <RentIndexView lang="id" />
}
