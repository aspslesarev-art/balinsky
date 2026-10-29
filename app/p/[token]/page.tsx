import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSessionTelegramId } from '@/lib/site-auth'
import { getByToken, listItems, publicAgent } from '@/lib/collections'
import { ClientCollection, type ClientItem } from '@/components/collections/ClientCollection'
import { anonListingTitle } from '@/lib/listing-title'

// Подборка агента для клиента по личной ссылке, без входа. Экраны 5–6 макета
// https://claude.ai/artifact/TEUDdpFWhCUY4aDcWN3N5K. Сверху агент и его
// контакты, ниже объекты с заметками. Контактов застройщиков здесь нет.

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await getByToken((await params).token).catch(() => null)
  return {
    title: found?.collection.active ? `${found.collection.title} | подборка объектов на Бали` : 'Подборка | Balinsky',
    robots: { index: false, follow: false },
  }
}

export default async function Page({ params, searchParams }: Params) {
  const { token } = await params
  const found = await getByToken(token)
  if (!found) notFound()
  const agent = await publicAgent(found.owner)
  if (!found.collection.active) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-[560px] flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-[24px] font-semibold tracking-tight">Подборка закрыта</h1>
        <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)]">{agent.name} закрыл эту ссылку. Напишите агенту - пришлёт новую.</p>
      </main>
    )
  }
  const items = await listItems(found.collection.id)
  const q = await searchParams
  // Агент смотрит свою подборку — в историю открытий это не пишем.
  const viewer = await getSessionTelegramId()
  const track = viewer !== found.owner && q.preview !== '1'
  // Клиенту — ни названия комплекса, ни адреса объекта на сайте: заголовок из
  // района, площади и спален, ссылка — по номеру в подборке.
  const shown: ClientItem[] = items.map((it, i) => ({
    n: i + 1,
    kind: it.kind,
    title: anonListingTitle({ kind: it.kind, district: it.snapshot.district, area: it.snapshot.area, bedrooms: it.snapshot.bedrooms != null ? String(it.snapshot.bedrooms) : null, lang: 'ru' }),
    photo: it.snapshot.photo,
    priceUsd: it.snapshot.priceUsd,
    leaseYears: it.snapshot.leaseYears,
    status: it.snapshot.status,
    note: it.note,
  }))
  return <ClientCollection token={token} title={found.collection.title} intro={found.collection.intro} items={shown} agent={agent} track={track} />
}
