import { makeHubPage } from '@/lib/hub-page'
import { villaHub } from '@/app/ru/villy/_hub'

// Catalog hub, e.g. /fr/villas/canggu — see lib/hub-page.tsx.
const hub = makeHubPage(villaHub, 'fr')

export const revalidate = 86400
export function generateStaticParams() { return [] }
export const generateMetadata = hub.generateMetadata
export default hub.Page
