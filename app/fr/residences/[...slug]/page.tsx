import { makeHubPage } from '@/lib/hub-page'
import { complexHub } from '@/app/ru/zhilye-kompleksy/_hub'

// Catalog hub, e.g. /fr/residences/canggu — see lib/hub-page.tsx.
const hub = makeHubPage(complexHub, 'fr')

export const revalidate = 604800
export function generateStaticParams() { return [] }
export const generateMetadata = hub.generateMetadata
export default hub.Page
