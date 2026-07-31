import { notFound } from 'next/navigation'
import { Golos_Text } from 'next/font/google'
import { loadDeveloperTemplateData, listPreviewDevelopers } from '@/lib/preview/developer-template'
import { DeveloperTemplate } from './_template'
import '../preview.css'

// The handoff pins Golos Text 400/500/600 everywhere, including buttons.
const golos = Golos_Text({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600'], display: 'swap' })

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Прототип шаблона застройщика' }

/**
 * The map key is handed down from the server rather than read from the client
 * bundle, so which key ships is decided in one place.
 *
 * There is no key in this project that renders Maps JS on localhost:
 * `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is referrer-locked to balinsky.info, and
 * `GOOGLE_PLACES_KEY` — though unrestricted by referrer — is API-restricted to
 * Places and answers ApiTargetBlockedMapError for Maps JS. Locally the map
 * therefore falls back to OSM; to change that, add http://localhost:3000/* to
 * the public key's referrer allowlist in Google Cloud Console.
 */
function mapsKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''
}

export default async function DeveloperTemplatePreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [data, all] = await Promise.all([loadDeveloperTemplateData(slug), listPreviewDevelopers()])
  if (!data) notFound()
  return (
    <div className={golos.className}>
      <DeveloperTemplate data={data} allDevelopers={all} mapsKey={mapsKey()} />
    </div>
  )
}
