import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { getSiteUser } from '@/lib/site-auth'
import { listByAuthor } from '@/lib/agent-listings/store'
import { EditListingForm } from './_form'

// Правка своего объекта: только цена и комментарий — характеристики юнита
// менять нельзя (см. app/api/kabinet/listings/[id]/route.ts).

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Изменить объект | Balinsky',
  robots: { index: false, follow: false },
}

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([getSiteUser(), params])
  if (!user) redirect(`/pro?next=/kabinet/objekty/${encodeURIComponent(id)}`)
  // Только свои: ищем среди объектов автора, чужой id — 404.
  const listing = (await listByAuthor(user.telegramId)).find(l => l.id === id)
  if (!listing) notFound()

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-12 sm:px-6">
        <Link href="/kabinet/objekty" className="self-start text-[14px] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)]">← Мои объекты</Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{listing.title}</h1>
          <p className="text-[14px] leading-relaxed text-[var(--color-text-muted)]">
            Можно поменять цену и комментарий. Характеристики берутся из каталога и не меняются.
          </p>
        </div>
        <EditListingForm id={listing.id} priceUsd={listing.priceUsd} comment={listing.comment} />
      </main>
    </>
  )
}
