import { PromoList, generatePromoListMetadata } from './_page'

export const revalidate = 600
export const metadata = generatePromoListMetadata('ru')

export default async function Page() {
  return <PromoList lang="ru" />
}
