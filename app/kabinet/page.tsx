import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Home, UserRound, CreditCard, ChevronRight, Check } from 'lucide-react'
import { Header } from '@/components/Header'
import { WishlistRow } from '@/components/kabinet/WishlistRow'
import { getSiteUser, getProStatus } from '@/lib/site-auth'
import { countByAuthor } from '@/lib/agent-listings/store'

// Личный кабинет, вариант B из макета (владелец 22.10.2026,
// https://claude.ai/artifact/WNV7xCPXhUBskR9ztyyG6w): шапка с именем и
// значком Pro, ниже список разделов. Форма профиля — /kabinet/profil.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Личный кабинет | Balinsky',
  // Personal, per-visitor and behind a login — nothing here belongs in an index.
  robots: { index: false, follow: false },
}

const ROW =
  'flex items-center gap-4 px-6 py-5 no-underline text-[var(--color-text)] transition-colors duration-[120ms] hover:bg-[var(--color-surface-alt)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-primary)]'
const ICON =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]'

const PRO_PERKS = [
  'Доходность и окупаемость',
  'Будет ли спрос: Booking и Airbnb',
  'Калькулятор посуточной аренды',
  'Что сдают рядом за те же деньги',
]

export default async function KabinetPage() {
  const user = await getSiteUser()
  // Гость — на общую страницу входа Pro, после входа вернёт сюда.
  if (!user) redirect('/pro?next=/kabinet')
  const [objects, pro] = await Promise.all([countByAuthor(user.telegramId), getProStatus(user.telegramId)])
  const proText = pro === 'granted' ? 'Pro открыт' : pro === 'denied' ? 'Без Pro' : 'Pro на проверке'

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : 'Без имени')
  const initial = (user.firstName || user.username || '?').trim().charAt(0).toUpperCase()

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[26px] font-semibold text-white" aria-hidden>
            {initial}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[28px] font-semibold leading-tight tracking-tight">{name}</h1>
              {pro === 'granted' && <span className="rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 text-[12px] font-semibold tracking-wide text-white">PRO</span>}
            </div>
            <span className="text-[14px] text-[var(--color-text-muted)]">
              {user.username && name !== `@${user.username}` ? `@${user.username} · ` : ''}{proText}
            </span>
          </div>
          <form method="POST" action="/api/account">
            <input type="hidden" name="action" value="logout" />
            <button type="submit" className="cursor-pointer rounded-lg px-2 py-2 text-[14px] text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]">
              Выйти
            </button>
          </form>
        </div>

        <section className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
          <WishlistRow className={ROW} />
          <Link href="/kabinet/objekty" className={ROW}>
            <span className={ICON}><Home size={20} strokeWidth={2} aria-hidden /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-semibold">Мои объекты</span>
              <span className="text-[14px] text-[var(--color-text-muted)]">
                {objects > 0 ? `Добавлено: ${objects}` : 'Пока нет. Добавьте виллу или апартаменты с вашими контактами'}
              </span>
            </span>
            <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden />
          </Link>
          <Link href="/kabinet/profil" className={ROW}>
            <span className={ICON}><UserRound size={20} strokeWidth={2} aria-hidden /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-semibold">Профиль и контакты</span>
              <span className="text-[14px] text-[var(--color-text-muted)]">Имя, телефон, агентство - для презентаций и ваших объектов</span>
            </span>
            <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden />
          </Link>
          {/* Оплаты пока нет — строка без ссылки, только статус. */}
          <div className="flex items-center gap-4 px-6 py-5">
            <span className={ICON}><CreditCard size={20} strokeWidth={2} aria-hidden /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-semibold">Подписка Pro</span>
              <span className="text-[14px] text-[var(--color-text-muted)]">{pro === 'granted' ? 'Доступ открыт' : pro === 'denied' ? 'Доступ не открыт' : 'На проверке - придёт сообщение, когда откроем'}</span>
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-[var(--color-surface-alt)] p-6">
          <h2 className="text-[16px] font-semibold">Что открывает Pro</h2>
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {PRO_PERKS.map(p => (
              <li key={p} className="flex items-center gap-2 text-[14px] leading-relaxed text-[#1F3B2F]">
                <Check size={16} strokeWidth={2.25} className="shrink-0 text-[var(--color-primary)]" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}
