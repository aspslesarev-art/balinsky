import { PromoList, generatePromoListMetadata } from '../../ru/akcii/_page'

export const revalidate = 3600
export const metadata = generatePromoListMetadata('de')

export default async function Page() {
  return <PromoList lang="de" />
}
