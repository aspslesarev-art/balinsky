'use client'

// Окно согласия на cookie — показывается только тем, кому его требует закон
// (решает components/Analytics.tsx через lib/consent.ts). Обе кнопки одинаково
// заметны: «Отклонить» не должна быть спрятана — это требование GDPR.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { detectLang, type Lang } from '@/lib/i18n'
import { writeConsent } from '@/lib/consent'

const COPY: Record<Lang, { text: string; accept: string; decline: string; more: string; href: string }> = {
  ru: { text: 'Мы используем cookie Google Analytics и Яндекс.Метрики, чтобы понимать, какие страницы полезны. Включим их только с вашего согласия.', accept: 'Принять', decline: 'Отклонить', more: 'Подробнее', href: '/ru/cookie' },
  en: { text: 'We use Google Analytics and Yandex Metrica cookies to see which pages are useful. They stay off unless you agree.', accept: 'Accept', decline: 'Decline', more: 'Learn more', href: '/en/cookie' },
  id: { text: 'Kami memakai cookie Google Analytics dan Yandex Metrica untuk melihat halaman mana yang berguna. Cookie ini hanya aktif jika Anda setuju.', accept: 'Terima', decline: 'Tolak', more: 'Selengkapnya', href: '/id/cookie' },
  fr: { text: 'Nous utilisons les cookies de Google Analytics et Yandex Metrica pour savoir quelles pages sont utiles. Ils restent désactivés sans votre accord.', accept: 'Accepter', decline: 'Refuser', more: 'En savoir plus', href: '/fr/cookie' },
  de: { text: 'Wir nutzen Cookies von Google Analytics und Yandex Metrica, um zu sehen, welche Seiten hilfreich sind. Sie bleiben aus, solange Sie nicht zustimmen.', accept: 'Akzeptieren', decline: 'Ablehnen', more: 'Mehr erfahren', href: '/de/cookie' },
  zh: { text: '我们使用 Google Analytics 和 Yandex Metrica 的 Cookie 来了解哪些页面有用。未经您同意，它们不会启用。', accept: '接受', decline: '拒绝', more: '了解更多', href: '/zh/cookie' },
  nl: { text: 'We gebruiken cookies van Google Analytics en Yandex Metrica om te zien welke pagina’s nuttig zijn. Ze blijven uit zolang u niet akkoord gaat.', accept: 'Accepteren', decline: 'Weigeren', more: 'Meer informatie', href: '/nl/cookie' },
  ban: { text: 'Iraga nganggén cookie Google Analytics miwah Yandex Metrica anggén uning halaman sané mapikenoh. Cookie puniki wantah aktif yéning ragané setuju.', accept: 'Nampi', decline: 'Nulak', more: 'Sané lianan', href: '/ban/cookie' },
  pl: { text: 'Używamy plików cookie Google Analytics i Yandex Metrica, aby wiedzieć, które strony są przydatne. Pozostają wyłączone bez Twojej zgody.', accept: 'Akceptuję', decline: 'Odrzucam', more: 'Więcej', href: '/pl/cookie' },
  uk: { text: 'Ми використовуємо cookie Google Analytics і Яндекс.Метрики, щоб розуміти, які сторінки корисні. Вони вимкнені, доки ви не погодитесь.', accept: 'Прийняти', decline: 'Відхилити', more: 'Докладніше', href: '/ua/cookie' },
}

const BTN = 'h-11 flex-1 sm:flex-none sm:px-6 rounded-[10px] text-[15px] font-medium inline-flex items-center justify-center transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] cursor-pointer'

export function CookieConsent() {
  const lang = detectLang(usePathname() ?? '')
  const c = COPY[lang] ?? COPY.en
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie"
      className="fixed inset-x-0 bottom-0 z-[1000] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-[960px] rounded-[12px] border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4 sm:p-6 shadow-[0_1px_2px_rgb(0_0_0/.04),0_8px_24px_rgb(0_0_0/.08)] flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <p className="text-[14px] leading-[1.55] text-[var(--color-text)] max-w-[68ch]">
          {c.text}{' '}
          <Link href={c.href} className="underline underline-offset-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary-pressed)]">
            {c.more}
          </Link>
        </p>
        <div className="flex gap-3 sm:ml-auto shrink-0">
          <button
            type="button"
            onClick={() => writeConsent('denied')}
            className={`${BTN} border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]`}
          >
            {c.decline}
          </button>
          <button
            type="button"
            onClick={() => writeConsent('granted')}
            className={`${BTN} bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`}
          >
            {c.accept}
          </button>
        </div>
      </div>
    </div>
  )
}

const SETTINGS_LABEL: Record<Lang, string> = {
  ru: 'Изменить выбор cookie', en: 'Change cookie choice', id: 'Ubah pilihan cookie', fr: 'Modifier mon choix de cookies',
  de: 'Cookie-Auswahl ändern', zh: '更改 Cookie 选择', nl: 'Cookiekeuze wijzigen', ban: 'Uah pilihan cookie',
  pl: 'Zmień wybór cookie', uk: 'Змінити вибір cookie',
}

/** Кнопка на странице /cookie: сбрасывает выбор, чтобы окно спросило снова. */
export function CookieSettingsButton({ lang }: { lang: Lang }) {
  return (
    <button
      type="button"
      onClick={() => writeConsent(null)}
      className={`${BTN} sm:flex-none px-6 border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]`}
    >
      {SETTINGS_LABEL[lang] ?? SETTINGS_LABEL.en}
    </button>
  )
}
