import { notFound } from 'next/navigation'
import { Golos_Text } from 'next/font/google'
import { loadDeveloperTemplateData, listPreviewDevelopers } from '@/lib/preview/developer-template'
import { DeveloperTemplate } from './_template'
import '../preview.css'

// The handoff pins Golos Text 400/500/600 everywhere, including buttons.
const golos = Golos_Text({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600'], display: 'swap' })

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Прототип шаблона застройщика' }

export default async function DeveloperTemplatePreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [data, all] = await Promise.all([loadDeveloperTemplateData(slug), listPreviewDevelopers()])
  if (!data) notFound()
  return (
    <div className={golos.className}>
      <DeveloperTemplate data={data} allDevelopers={all} />
    </div>
  )
}
