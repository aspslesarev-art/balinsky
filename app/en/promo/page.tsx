import { PromoList, generatePromoListMetadata } from '../../ru/akcii/_page'

export const revalidate = 600
export const metadata = generatePromoListMetadata('en')

export default async function Page() {
  return <PromoList lang="en" />
}
