import { makeHubPage } from '@/lib/hub-page'
import { apartmentHub } from '@/app/ru/apartamenty/_hub'

// Catalog hub, e.g. /en/apartments/canggu — see lib/hub-page.tsx.
const hub = makeHubPage(apartmentHub, 'en')

export const revalidate = 86400
export function generateStaticParams() { return [] }
export const generateMetadata = hub.generateMetadata
export default hub.Page
