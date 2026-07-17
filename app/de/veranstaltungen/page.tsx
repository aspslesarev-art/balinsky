import { EventsList, generateEventsListMetadata } from '../../ru/meropriyatiya/_page'

export const revalidate = 600
export const metadata = generateEventsListMetadata('de')

export default async function Page() {
  return <EventsList lang="de" />
}
