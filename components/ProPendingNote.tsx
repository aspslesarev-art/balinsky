import { pickCopy, type Lang } from '@/lib/i18n'

// Вошёл, но доступ Pro ещё не открыт: вместо аналитики — эта плашка
// (.bx-pending-only в globals.css). Макет «Бот + экран ожидания», 23.10.2026.
const COPY = {
  ru: { title: 'Доступ Pro на проверке', text: 'Откроем доходность и спрос, как только проверим. Обычно в течение дня. Придёт сообщение в Telegram или на почту.' },
  en: { title: 'Pro access is under review', text: 'We will open yields and demand as soon as we check. Usually within a day. You will get a message in Telegram or by email.' },
}

export function ProPendingNote({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  return (
    <div className="bx-pending-only my-8 rounded-2xl border border-[var(--color-border)] bg-white p-6">
      <p className="text-[16px] font-semibold">{c.title}</p>
      <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-[var(--color-text-muted)]">{c.text}</p>
    </div>
  )
}
