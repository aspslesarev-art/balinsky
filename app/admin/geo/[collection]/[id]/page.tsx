import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { isGeoCollection, loadGeoRow } from '@/lib/complex-geo'
import { GeoPlacementEditor } from './_editor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = Promise<{ collection: string; id: string }>

export default async function Page({ params }: { params: Params }) {
  if (!(await requireAdmin())) redirect('/admin')
  const { collection, id } = await params

  if (!isGeoCollection(collection)) {
    return (
      <Notice>
        Коллекция <code>{collection}</code> не поддерживается. Доступны{' '}
        <code>complexes</code>, <code>villas</code>, <code>apartments</code>.
      </Notice>
    )
  }

  const row = await loadGeoRow(collection, id)
  if (!row) {
    return (
      <Notice>
        Объект <code>{id}</code> не найден в <code>{collection}</code>.
      </Notice>
    )
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''
  if (!apiKey) {
    return (
      <Notice>
        Не задан <code>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> — карту нечем показать.
      </Notice>
    )
  }

  return <GeoPlacementEditor apiKey={apiKey} collection={collection} row={row} />
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-lg font-semibold">Привязка к карте</h1>
      <p className="mt-3 text-sm text-neutral-500">{children}</p>
    </main>
  )
}
