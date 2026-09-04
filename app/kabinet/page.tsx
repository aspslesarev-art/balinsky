import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import Link from 'next/link'
import { getSiteUser } from '@/lib/site-auth'
import { getAgentContact } from '@/lib/agent-listings/store'
import { LOGIN_URL } from '@/components/GatedBlock'

// Account page: sign in, and once signed in, the name that goes on PDF
// presentations. Deliberately thin — an investor never has to touch it, and
// an agent only fills it in once, right before their first export.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Личный кабинет | Balinsky',
  // Personal, per-visitor and behind a login — nothing here belongs in an index.
  robots: { index: false, follow: false },
}

const INPUT =
  'mt-1 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none focus:border-[var(--color-primary)]'

export default async function KabinetPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; login?: string }>
}) {
  const [user, sp] = await Promise.all([getSiteUser(), searchParams])
  // Контакты агента — то, что увидит клиент на карточке добавленного объекта.
  const contact = user ? await getAgentContact(user.telegramId) : null

  if (!user) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-xl px-6 py-16">
        <h1 className="text-[26px] font-semibold tracking-tight text-[#111827]">Вход</h1>
        {sp.login === 'expired' && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
            Ссылка уже использована или устарела. Запросите новую — это займёт пару секунд.
          </p>
        )}
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          Вход через Telegram, без пароля. Бот пришлёт одноразовую ссылку — нажмите её,
          и аналитика района, тепловая карта, расчёты доходности и рейтинги откроются.
        </p>
        <a
          href={LOGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#229ED9] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#1b8ec2]"
        >
          Войти через Telegram
        </a>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="text-[26px] font-semibold tracking-tight text-[#111827]">Личный кабинет</h1>
      <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
        Вы вошли{user.username ? ` как @${user.username}` : ''}. Вся аналитика на сайте открыта.
      </p>

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
          <label htmlFor="firstName" className="text-[14px] font-medium text-[#111827]">Имя</label>
          <input id="firstName" name="firstName" defaultValue={user.firstName ?? ''} className={INPUT} />
        </div>
        <div>
          <label htmlFor="lastName" className="text-[14px] font-medium text-[#111827]">Фамилия</label>
          <input id="lastName" name="lastName" defaultValue={user.lastName ?? ''} className={INPUT} />
        </div>
        <div>
          <label htmlFor="phone" className="text-[14px] font-medium text-[#111827]">Телефон</label>
          <input id="phone" name="phone" defaultValue={contact?.phone ?? ''} placeholder="+62 …" className={INPUT} />
        </div>
        <div>
          <label htmlFor="agency" className="text-[14px] font-medium text-[#111827]">Агентство</label>
          <input id="agency" name="agency" defaultValue={contact?.agency ?? ''} className={INPUT} />
        </div>
        <div>
          <label htmlFor="contactNote" className="text-[14px] font-medium text-[#111827]">Как с вами связаться</label>
          <input id="contactNote" name="contactNote" defaultValue={contact?.note ?? ''}
            placeholder="Например: пишите в Telegram, отвечаю до 22:00 по Бали" className={INPUT} />
        </div>
        <label className="flex items-start gap-3 text-[14px] text-[#111827]">
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

      <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <p className="text-[15px] font-medium text-[#111827]">Свои объекты</p>
        <p className="mt-1 text-[14px] text-[var(--color-text-muted)]">
          Добавьте виллу или апартаменты: характеристики подтянутся из каталога, на карточке будут ваши контакты.
        </p>
        <Link href="/kabinet/objekty"
          className="mt-4 inline-flex rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-[15px] font-semibold text-white">
          Мои объекты
        </Link>
      </div>

      <form method="POST" action="/api/account" className="mt-10">
        <input type="hidden" name="action" value="logout" />
        <button type="submit" className="text-[14px] text-[var(--color-text-muted)] underline">
          Выйти
        </button>
      </form>
      </main>
    </>
  )
}
