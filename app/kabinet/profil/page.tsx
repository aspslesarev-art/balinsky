import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { getSiteUser } from '@/lib/site-auth'
import { getAgentContact } from '@/lib/agent-listings/store'
import { redirect } from 'next/navigation'

// Профиль: имя и контакты, которые подставляются в PDF-подборки и на
// карточки своих объектов. Макет — «Профиль и контакты» на холсте
// https://claude.ai/artifact/WNV7xCPXhUBskR9ztyyG6w (владелец 22.10.2026).

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Профиль и контакты | Balinsky',
  // Personal, per-visitor and behind a login — nothing here belongs in an index.
  robots: { index: false, follow: false },
}

const INPUT =
  'w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-[15px] font-normal text-[var(--color-text)] outline-none transition-colors duration-[120ms] focus:border-[var(--color-primary)]'
const LABEL = 'flex flex-col gap-2 text-[14px] font-medium text-[var(--color-text)]'
const CARD = 'flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-white p-6'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const [user, sp] = await Promise.all([getSiteUser(), searchParams])
  // Гость — на общую страницу входа Pro, после входа вернёт сюда.
  if (!user) redirect('/pro?next=/kabinet/profil')
  // Контакты агента — то, что увидит клиент на карточке добавленного объекта.
  const contact = await getAgentContact(user.telegramId)

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : 'Без имени')
  const initial = (user.firstName || user.username || '?').trim().charAt(0).toUpperCase()

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 py-12 sm:px-6">
        <Link href="/kabinet" className="self-start text-[14px] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)]">← Кабинет</Link>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">Профиль и контакты</h1>

        {sp.error === '1' && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-[14px] text-red-900">Не удалось сохранить. Попробуйте ещё раз.</p>
        )}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          <form method="POST" action="/api/account" className="flex min-w-0 flex-1 flex-col gap-6">
            <section className={CARD}>
              <h2 className="text-[16px] font-semibold">О вас</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={LABEL}>Имя
                  <input name="firstName" defaultValue={user.firstName ?? ''} autoComplete="given-name" className={INPUT} />
                </label>
                <label className={LABEL}>Фамилия
                  <input name="lastName" defaultValue={user.lastName ?? ''} autoComplete="family-name" className={INPUT} />
                </label>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-4 pt-2">
                <span className="flex flex-col gap-1">
                  <span className="text-[15px] font-medium">Я агент</span>
                  <span className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                    Контакты попадут в PDF-презентации и на карточки ваших объектов
                  </span>
                </span>
                {/* Переключатель — обычный чекбокс, чтобы форма работала без JS. */}
                <input type="checkbox" name="isAgent" defaultChecked={user.isAgent} className="peer sr-only" />
                <span
                  aria-hidden
                  className="relative h-6 w-11 shrink-0 rounded-full bg-[#C9D2CE] transition-colors duration-[120ms] after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:duration-[120ms] peer-checked:bg-[var(--color-primary)] peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-primary)]"
                />
              </label>
            </section>

            <section className={CARD}>
              <h2 className="text-[16px] font-semibold">Контакты для клиентов</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={LABEL}>Телефон / WhatsApp
                  <input name="phone" defaultValue={contact?.phone ?? ''} placeholder="+62 …" inputMode="tel" autoComplete="tel" className={INPUT} />
                </label>
                <label className={LABEL}>Агентство
                  <input name="agency" defaultValue={contact?.agency ?? ''} autoComplete="organization" className={INPUT} />
                </label>
              </div>
              <label className={LABEL}>Как с вами связаться
                <input name="contactNote" defaultValue={contact?.note ?? ''}
                  placeholder="Например: пишите в Telegram, отвечаю до 22:00 по Бали" className={INPUT} />
              </label>
            </section>

            <div className="flex items-center gap-4">
              <button type="submit" className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-6 py-3 text-[15px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                Сохранить
              </button>
              {sp.saved === '1' && (
                <span className="flex items-center gap-1.5 text-[14px] text-[var(--color-primary-pressed)]" role="status">
                  <Check size={16} strokeWidth={2.25} aria-hidden /> Сохранено
                </span>
              )}
            </div>
          </form>

          {/* Превью — по сохранённым данным, как на карточке объекта. */}
          <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[340px]">
            <h2 className="text-[13px] font-semibold tracking-wide text-[var(--color-text-muted)]">ТАК ВАС УВИДИТ КЛИЕНТ</h2>
            <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/.04),0_4px_12px_rgb(0_0_0/.06)]">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[20px] font-semibold text-white" aria-hidden>{initial}</span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[16px] font-semibold">{name}</span>
                  {contact?.agency && <span className="truncate text-[13px] text-[var(--color-text-muted)]">{contact.agency}</span>}
                </span>
              </div>
              {contact?.note && <p className="text-[14px] leading-relaxed text-[var(--color-text-muted)]">{contact.note}</p>}
              {(user.username || contact?.phone) ? (
                <div className="grid grid-cols-2 gap-2">
                  {user.username && (
                    <span className="rounded-lg bg-[#1877B8] px-3 py-2.5 text-center text-[14px] font-semibold text-white">Telegram</span>
                  )}
                  {contact?.phone && (
                    <span className="truncate rounded-lg bg-[#15843F] px-3 py-2.5 text-center text-[14px] font-semibold text-white">{contact.phone}</span>
                  )}
                </div>
              ) : (
                <p className="text-[14px] text-[var(--color-text-muted)]">Добавьте телефон, чтобы клиент мог связаться.</p>
              )}
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              На последней странице PDF-подборки и на карточках объектов, которые вы добавили.
            </p>
          </aside>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-[14px] text-[var(--color-text-muted)]">
          <span>{user.username ? `Вход: Telegram @${user.username}` : 'Вы вошли в аккаунт'}</span>
          <form method="POST" action="/api/account">
            <input type="hidden" name="action" value="logout" />
            <button type="submit" className="cursor-pointer underline hover:text-[var(--color-text)]">Выйти из аккаунта</button>
          </form>
        </div>
      </main>
    </>
  )
}
