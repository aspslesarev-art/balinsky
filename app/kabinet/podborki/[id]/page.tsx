import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { getSiteUser } from '@/lib/site-auth'
import { getOwned, listItems, listVisits, proOwner } from '@/lib/collections'
import { CollectionEditor } from '@/components/collections/CollectionEditor'

// Одна подборка агента: объекты, заметки, ссылка, что смотрел клиент и
// история открытий. Экран 2 макета https://claude.ai/artifact/TEUDdpFWhCUY4aDcWN3N5K.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Подборка | Balinsky',
  robots: { index: false, follow: false },
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSiteUser()
  if (!user) redirect(`/pro?next=/kabinet/podborki/${id}`)
  const owner = await proOwner()
  if (owner == null) redirect('/kabinet/podborki')
  const collection = await getOwned(owner, id)
  if (!collection) notFound()
  const [items, visits] = await Promise.all([listItems(id), listVisits(id)])

  return (
    <>
      <Header />
      <CollectionEditor collection={collection} initialItems={items} visits={visits} />
    </>
  )
}
