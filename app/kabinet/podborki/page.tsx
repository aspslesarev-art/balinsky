import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eye } from 'lucide-react'
import { Header } from '@/components/Header'
import { getSiteUser } from '@/lib/site-auth'
import { listCollections, proOwner } from '@/lib/collections'
import { CopyLink } from '@/components/collections/CopyLink'
import { NewCollection } from '@/components/collections/NewCollection'
import { objectsRu, timesRu, whenRu } from '@/components/collections/format'

// Подборки для клиентов (Pro), экран 1 макета
// https://claude.ai/artifact/TEUDdpFWhCUY4aDcWN3N5K.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Подборки для клиентов | Balinsky',
  robots: { index: false, follow: false },
}

export default async function CollectionsPage() {
  const user = await getSiteUser()
  if (!user) redirect('/pro?next=/kabinet/podborki')
  const owner = await proOwner()
  const lists = owner != null ? await listCollections(owner) : []

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full min-w-0 max-w-[1184px] flex-col gap-8 px-4 py-12 sm:px-6">
        <Link href="/kabinet" className="self-start text-[14px] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)]">← Кабинет</Link>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex max-w-[68ch] flex-col gap-2">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">Подборки для клиентов</h1>
            <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)]">
              Соберите объекты под клиента и отправьте одну ссылку. Контакты застройщиков клиент не видит - только ваши.
            </p>
          </div>
          {owner != null && <div className="sm:ml-auto"><NewCollection /></div>}
        </div>

        {owner == null ? (
          <section className="rounded-xl bg-[var(--color-surface-alt)] p-6 text-[15px] leading-relaxed">
            Подборки - инструмент Pro. Как только откроем доступ, придёт сообщение в Telegram.
          </section>
        ) : lists.length === 0 ? (
          <section className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#C9D2CE] px-6 py-12 text-center">
            <h2 className="text-[16px] font-semibold">Здесь будут подборки ваших клиентов</h2>
            <p className="max-w-[460px] text-[14px] leading-relaxed text-[var(--color-text-muted)]">
              Создайте подборку с именем клиента, затем на странице любой виллы или апартаментов нажмите «В подборку».
            </p>
          </section>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map(l => (
              <li key={l.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
                <Link href={`/kabinet/podborki/${l.id}`} className="grid h-[162px] grid-cols-[2fr_1fr] grid-rows-2 gap-0.5 bg-[var(--color-surface-alt)]" aria-label={`Открыть подборку «${l.title}»`}>
                  {[0, 1, 2].map(i => l.photos[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- превью из снимка объекта, размер фиксирован
                    <img key={i} src={l.photos[i]} alt="" className={`h-full w-full object-cover ${i === 0 ? 'row-span-2' : ''}`} />
                  ) : (
                    <span key={i} className={`bg-[var(--color-search-bg)] ${i === 0 ? 'row-span-2' : ''}`} aria-hidden />
                  ))}
                </Link>
                <div className="flex flex-col gap-1 px-4 pb-3 pt-4">
                  <h2 className="truncate text-[17px] font-semibold leading-snug">{l.title}</h2>
                  <p className="text-[14px] text-[var(--color-text-muted)]">
                    {objectsRu(l.count)} · обновлена {whenRu(l.updatedAt, false)}{l.active ? '' : ' · ссылка выключена'}
                  </p>
                </div>
                <p className={`mx-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] ${l.visits ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                  <Eye size={16} aria-hidden className="shrink-0" />
                  {l.visits && l.lastVisitAt ? `Открыл ${timesRu(l.visits)}, последний - ${whenRu(l.lastVisitAt)}` : 'Ещё не открывал'}
                </p>
                <div className="mt-auto flex gap-2 px-4 pb-4 pt-3">
                  <CopyLink token={l.token} />
                  <Link href={`/kabinet/podborki/${l.id}`}
                    className="flex h-10 items-center rounded-lg bg-[var(--color-primary-soft)] px-4 text-[14px] font-semibold text-[var(--color-primary-pressed)] no-underline hover:bg-[#d3e8dc]">
                    Открыть
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
