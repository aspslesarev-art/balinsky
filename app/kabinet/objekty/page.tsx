import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import Link from 'next/link'
import { getSiteUser } from '@/lib/site-auth'
import { listByAuthor, getAgentContact } from '@/lib/agent-listings/store'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { DeleteListingButton } from './_actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Мои объекты | Balinsky',
  robots: { index: false, follow: false },
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'На проверке',
  approved: 'В каталоге',
  rejected: 'Отклонён',
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-[#FDF3E1] text-[#7A4B0B]',
  approved: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]',
  rejected: 'bg-[#FBE7E5] text-[#8A1F14]',
}

const DATE = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })

export default async function MyListingsPage() {
  const user = await getSiteUser()
  // Гость — на общую страницу входа Pro, после входа вернёт сюда.
  if (!user) redirect('/pro?next=/kabinet/objekty')
  const [listings, contact] = await Promise.all([listByAuthor(user.telegramId), getAgentContact(user.telegramId)])
  const contactLine = [contact?.name, contact?.phone, contact?.agency].filter(Boolean).join(' · ')

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-12 sm:px-6">
        <Link href="/kabinet" className="self-start text-[14px] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)]">← Кабинет</Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">Мои объекты</h1>
          <Link href="/kabinet/objekty/novyj"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-3 text-[15px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
            <Plus size={16} strokeWidth={2.25} aria-hidden /> Добавить объект
          </Link>
        </div>

        {listings.length === 0 ? (
          <section className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#C9D2CE] px-6 py-10 text-center">
            <h2 className="text-[16px] font-semibold">Здесь будут ваши виллы и апартаменты</h2>
            <p className="max-w-[440px] text-[14px] leading-relaxed text-[var(--color-text-muted)]">
              Выберите комплекс - характеристики подтянутся из каталога. На карточке будут ваши контакты.
            </p>
          </section>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            {listings.map(l => (
              <li key={l.id} className="flex flex-col gap-3 px-4 py-5 sm:px-6">
                <div className="flex items-start gap-4">
                  {l.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- фото агента из Storage, размер превью фиксирован
                    <img src={l.photos[0]} alt="" className="h-[76px] w-[112px] shrink-0 rounded-lg object-cover max-sm:h-16 max-sm:w-20" />
                  ) : (
                    <span className="h-[76px] w-[112px] shrink-0 rounded-lg bg-[var(--color-search-bg)] max-sm:h-16 max-sm:w-20" aria-hidden />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={`/ru/pereprodazha/o/${l.slug}`} className="text-[16px] font-semibold text-[var(--color-text)] no-underline hover:underline">
                      {l.title}
                    </Link>
                    <span className="text-[15px] font-semibold text-[var(--color-primary)]">${l.priceUsd.toLocaleString('en-US')}</span>
                    <span className="text-[13px] text-[var(--color-text-muted)]">
                      Добавлен {DATE.format(new Date(l.createdAt))}
                      {l.status === 'pending' ? ' · страница уже открывается по ссылке' : ''}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <span className={`rounded-full px-3 py-1 text-[13px] font-medium ${STATUS_CLASS[l.status] ?? 'bg-[var(--color-search-bg)] text-[var(--color-text-muted)]'}`}>
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                    <div className="hidden items-center gap-4 text-[14px] sm:flex">
                      <Link href={`/kabinet/objekty/${l.id}`}>Изменить</Link>
                      <DeleteListingButton id={l.id} title={l.title} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[14px] sm:hidden">
                  <Link href={`/kabinet/objekty/${l.id}`}>Изменить</Link>
                  <DeleteListingButton id={l.id} title={l.title} />
                </div>
                {l.status === 'rejected' && l.rejectReason && (
                  <p className="rounded-lg bg-[#FBE7E5] px-3.5 py-2.5 text-[14px] leading-relaxed text-[#8A1F14]">Причина: {l.rejectReason}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <section className="flex flex-wrap items-center gap-4 rounded-xl bg-[var(--color-surface-alt)] px-6 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-[16px] font-semibold">Контакты на ваших карточках</h2>
            <span className="text-[14px] text-[var(--color-text-muted)]">{contactLine || 'Пока не заполнены'}</span>
          </div>
          <Link href="/kabinet/profil" className="text-[14px]">Изменить в профиле</Link>
        </section>
      </main>
    </>
  )
}
