import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import Link from 'next/link'
import { getSiteUser } from '@/lib/site-auth'
import { listByAuthor } from '@/lib/agent-listings/store'
import { LOGIN_URL } from '@/components/GatedBlock'

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
  pending: 'bg-amber-50 text-amber-900',
  approved: 'bg-emerald-50 text-emerald-900',
  rejected: 'bg-red-50 text-red-900',
}

export default async function MyListingsPage() {
  const user = await getSiteUser()

  if (!user) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-xl px-6 py-16">
        <h1 className="text-[26px] font-semibold tracking-tight text-[#111827]">Вход</h1>
        <p className="mt-3 text-[15px] text-[var(--color-text-muted)]">
          Свои объекты видно после входа через Telegram.
        </p>
        <a href={LOGIN_URL} target="_blank" rel="noopener noreferrer"
          className="mt-6 inline-flex rounded-xl bg-[#229ED9] px-6 py-3 text-[15px] font-semibold text-white">
          Войти через Telegram
        </a>
        </main>
      </>
    )
  }

  const listings = await listByAuthor(user.telegramId)

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[26px] font-semibold tracking-tight text-[#111827] sm:text-[32px]">Мои объекты</h1>
        <Link href="/kabinet/objekty/novyj"
          className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-[15px] font-semibold text-white">
          Добавить объект
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="mt-8 text-[15px] text-[var(--color-text-muted)]">
          Вы пока не добавили ни одного объекта.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {listings.map(l => (
            <li key={l.id} className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/ru/pereprodazha/o/${l.slug}`} className="text-[15px] font-medium text-[#111827] underline">
                    {l.title}
                  </Link>
                  <p className="mt-1 text-[15px] font-semibold text-[var(--color-primary)]">
                    ${l.priceUsd.toLocaleString('en-US')}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[13px] ${STATUS_CLASS[l.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
              </div>
              {l.status === 'rejected' && l.rejectReason && (
                <p className="mt-2 text-[14px] text-red-900">Причина: {l.rejectReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-[14px] text-[var(--color-text-muted)]">
        Контакты, которые видят клиенты на ваших карточках, задаются в{' '}
        <Link href="/kabinet" className="underline">личном кабинете</Link>.
      </p>
      </main>
    </>
  )
}
