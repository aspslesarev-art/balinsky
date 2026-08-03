import type { ReactNode } from 'react'
import type { Lang } from '@/lib/i18n'

// Registration gate for the analytics blocks (heat map, district stats,
// investment maths, developer reliability).
//
// SEO is the constraint that shapes this: the server HTML is byte-identical
// for every visitor, logged in or not, human or crawler. Nothing is stripped,
// nothing is swapped, so there is no cloaking risk and no cache variance —
// the same ISR-rendered page serves everyone. The gate is purely visual: CSS
// blurs the block unless `<html>` carries `data-auth="1"`, which an inline
// script in app/layout.tsx sets from the `bx_auth` cookie before first paint.
//
// The trade-off is deliberate and worth stating plainly: because the markup
// ships to the browser either way, this drives registrations — it does not
// keep the numbers secret from anyone willing to open the page source. If a
// block ever needs to be genuinely private, it must stop rendering
// server-side for anonymous users, which is a different mechanism.

const COPY = {
  ru: {
    title: 'Откройте аналитику',
    body: 'Регистрация в два клика через Telegram — и все цифры, карты и расчёты открыты.',
    cta: 'Войти через Telegram',
    note: 'Без пароля. Бот пришлёт ссылку — просто нажмите её.',
  },
  en: {
    title: 'Unlock the analytics',
    body: 'Two-tap sign-in with Telegram opens every figure, map and projection.',
    cta: 'Sign in with Telegram',
    note: 'No password. The bot sends a link — just tap it.',
  },
} as const

/** Deep link that makes the bot mint a one-time login link. */
export const LOGIN_URL = 'https://t.me/BalinskyBot?start=login'

export function GatedBlock({ children, lang = 'ru' }: { children: ReactNode; lang?: Lang }) {
  const c = lang === 'ru' ? COPY.ru : COPY.en
  return (
    <div className="bx-gate" data-gated>
      <div className="bx-gate-content">{children}</div>
      <div className="bx-gate-veil" aria-hidden="true" />
      <div className="bx-gate-cta">
        <div className="max-w-sm rounded-2xl bg-white/95 px-6 py-5 text-center shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
          <p className="text-base font-semibold text-gray-900">{c.title}</p>
          <p className="mt-1 text-sm text-gray-600">{c.body}</p>
          <a
            href={LOGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#229ED9] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1b8ec2]"
          >
            {c.cta}
          </a>
          <p className="mt-2 text-xs text-gray-500">{c.note}</p>
        </div>
      </div>
    </div>
  )
}
