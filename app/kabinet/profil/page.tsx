import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import Link from 'next/link'
import { getSiteUser } from '@/lib/site-auth'
import { getAgentContact } from '@/lib/agent-listings/store'
import { redirect } from 'next/navigation'

// Account page: sign in, and once signed in, the name that goes on PDF
// presentations. Deliberately thin — an investor never has to touch it, and
// an agent only fills it in once, right before their first export.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Профиль и контакты | Balinsky',
  // Personal, per-visitor and behind a login — nothing here belongs in an index.
  robots: { index: false, follow: false },
}

const INPUT =
  'mt-1 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-[15px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; login?: string }>
}) {
  const [user, sp] = await Promise.all([getSiteUser(), searchParams])
  // Контакты агента — то, что увидит клиент на карточке добавленного объекта.
  const contact = user ? await getAgentContact(user.telegramId) : null

  // Гость — на общую страницу входа Pro, после входа вернёт сюда.
  if (!user) redirect('/pro?next=/kabinet/profil')

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link href="/kabinet" className="text-[14px] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)]">← Кабинет</Link>
      <h1 className="mt-4 text-[26px] font-semibold tracking-tight text-[var(--color-text)]">Профиль и контакты</h1>

      {sp.saved === '1' && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-[14px] text-emerald-900">Сохранено.</p>
      )}
      {sp.error === '1' && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-900">
          Не удалось сохранить. Попробуйте ещё раз.
        </p>
      )}

      <form method="POST" action="/api/account" className="mt-8 space-y-5">
        <div>
          <label htmlFor="firstName" className="text-[14px] font-medium text-[var(--color-text)]">Имя</label>
          <input id="firstName" name="firstName" defaultValue={user.firstName ?? ''} className={INPUT} />
        </div>
        <div>
          <label htmlFor="lastName" className="text-[14px] font-medium text-[var(--color-text)]">Фамилия</label>
          <input id="lastName" name="lastName" defaultValue={user.lastName ?? ''} className={INPUT} />
        </div>
        <div>
          <label htmlFor="phone" className="text-[14px] font-medium text-[var(--color-text)]">Телефон</label>
          <input id="phone" name="phone" defaultValue={contact?.phone ?? ''} placeholder="+62 …" className={INPUT} />
        </div>
        <div>
          <label htmlFor="agency" className="text-[14px] font-medium text-[var(--color-text)]">Агентство</label>
          <input id="agency" name="agency" defaultValue={contact?.agency ?? ''} className={INPUT} />
        </div>
        <div>
          <label htmlFor="contactNote" className="text-[14px] font-medium text-[var(--color-text)]">Как с вами связаться</label>
          <input id="contactNote" name="contactNote" defaultValue={contact?.note ?? ''}
            placeholder="Например: пишите в Telegram, отвечаю до 22:00 по Бали" className={INPUT} />
        </div>
        <label className="flex items-start gap-3 text-[14px] text-[var(--color-text)]">
          <input type="checkbox" name="isAgent" defaultChecked={user.isAgent} className="mt-1" />
          <span>
            Я агент
            <span className="block text-[13px] text-[var(--color-text-muted)]">
              Имя, фамилия и контакты подставятся в PDF-презентации и на карточки объектов,
              которые вы добавите сами.
            </span>
          </span>
        </label>
        <button
          type="submit"
          className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-[15px] font-semibold text-white"
        >
          Сохранить
        </button>
      </form>

      </main>
    </>
  )
}
