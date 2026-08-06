import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { getSitePlan } from '@/lib/complex-sun-plan'
import { loadSunSettings } from '@/lib/complex-sun'
import { SunSettingsEditor } from './_editor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

export default async function Page({ params }: { params: Params }) {
  if (!(await requireAdmin())) redirect('/admin')
  const { slug } = await params

  const plan = getSitePlan(slug)
  if (!plan) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-lg font-semibold">Солнце и тень</h1>
        <p className="mt-3 text-sm text-neutral-500">
          Для комплекса <code>{slug}</code> нет обмера генплана. Планы задаются в{' '}
          <code>lib/complex-sun.ts</code> — нужен вектор мастерплана от застройщика.
        </p>
      </main>
    )
  }

  const settings = await loadSunSettings(slug)

  return (
    <SunSettingsEditor
      slug={slug}
      plan={plan}
      initial={{
        rowAzimuth: settings?.rowAzimuth ?? 90,
        latitude: settings?.latitude ?? 0,
        longitude: settings?.longitude ?? 0,
        eaveHeight: settings?.eaveHeight ?? 6.8,
        ridgeRise: settings?.ridgeRise ?? 2,
        yardWall: settings?.yardWall ?? 2.4,
        offsetX: settings?.offsetX ?? 0,
        offsetZ: settings?.offsetZ ?? 0,
        modelScale: settings?.modelScale ?? 1,
        basemapOffsetX: settings?.basemapOffsetX ?? 0,
        basemapOffsetZ: settings?.basemapOffsetZ ?? 0,
        basemapScale: settings?.basemapScale ?? 1,
        enabled: settings?.enabled ?? false,
      }}
    />
  )
}
