import { NewsList, generateNewsListMetadata } from '../../ru/novosti/_page'

export const revalidate = 600
export const metadata = generateNewsListMetadata('fr')

export default async function Page() {
  return <NewsList lang="fr" />
}
