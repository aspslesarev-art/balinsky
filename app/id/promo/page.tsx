import { PromoList, generatePromoListMetadata } from '../../ru/akcii/_page'

export const revalidate = 3600
export const metadata = generatePromoListMetadata('id')

export default async function Page() {
  return <PromoList lang="id" />
}
