import { PromoList, generatePromoListMetadata } from '../../ru/akcii/_page'

export const revalidate = 600
export const metadata = generatePromoListMetadata('nl')

export default async function Page() {
  return <PromoList lang="nl" />
}
