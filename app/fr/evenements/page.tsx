import { EventsList, generateEventsListMetadata } from '../../ru/meropriyatiya/_page'

export const revalidate = 3600
export const metadata = generateEventsListMetadata('fr')

export default async function Page() {
  return <EventsList lang="fr" />
}
