import { LoginCodeForm } from '@/components/LoginCodeForm'
import type { SiteUser } from '@/lib/site-auth'

// Два экрана до отчёта: «войдите» и «вас нет в списке».
//
// Гейт здесь настоящий, а не косметический, как у аналитики в каталоге:
// цифры чужих прайсов не должны уезжать в HTML тому, кому их не открывали,
// поэтому отчёт вообще не рендерится, пока сервер не проверил и сессию, и
// список доступа.

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 ring-1 ring-[var(--color-border)] sm:p-8">
      {children}
    </div>
  )
}

const BULLETS = [
  'Что вернулось в продажу — юнит был продан или в брони, а потом снова стал свободен.',
  'Как двигались цены — было, стало и на сколько процентов.',
  'Что ушло с рынка — переходы в «продано» с датами.',
]

export function LoginGate() {
  return (
    <Shell>
      <h1 className="text-[24px] font-semibold tracking-tight text-[#111827]">Движение рынка</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
        Ежедневный обход прайсов застройщиков Бали: что продаётся, что вернулось и куда идут цены.
        Отчёт закрытый — открывается по списку.
      </p>
      <ul className="mt-4 space-y-2">
        {BULLETS.map(b => (
          <li key={b} className="flex gap-2 text-[14px] leading-relaxed text-[#111827]">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[14px] text-[var(--color-text-muted)]">
        Вход через Telegram, без пароля: бот пришлёт четыре цифры.
      </p>
      <LoginCodeForm ctaLabel="Войти через Telegram" />
    </Shell>
  )
}

export function NoAccessGate({ user, botUrl }: { user: SiteUser; botUrl: string }) {
  const who = user.username ? `@${user.username}` : `id ${user.telegramId}`
  return (
    <Shell>
      <h1 className="text-[24px] font-semibold tracking-tight text-[#111827]">Отчёт закрыт</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
        Вы вошли как <span className="font-medium text-[#111827]">{who}</span>, но этого аккаунта нет
        в списке доступа к движению рынка.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
        Если доступ должен быть — напишите нам и пришлите эту строку:{' '}
        <span className="rounded-lg bg-[var(--color-search-bg)] px-2 py-0.5 font-mono text-[13px] text-[#111827]">
          {who}
        </span>
      </p>
      <a
        href={botUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#229ED9] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#1b8ec2]"
      >
        Написать в Telegram
      </a>
      <form method="POST" action="/api/account" className="mt-6">
        <input type="hidden" name="action" value="logout" />
        <button type="submit" className="text-[14px] text-[var(--color-text-muted)] underline">
          Выйти из аккаунта
        </button>
      </form>
    </Shell>
  )
}
