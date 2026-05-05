'use client'

import { usePathname, useRouter } from 'next/navigation'
import { switchLangPath, type Lang } from '@/lib/i18n'

// Same visual treatment as CurrencyToggle — appearance-none <select> with a
// chevron overlay. Keeps the header's right-side controls consistent.
export function LangSwitch({ className = '' }: { className?: string }) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const current: Lang = pathname.startsWith('/en') ? 'en' : 'ru'
  const label = current === 'en' ? 'Language' : 'Язык'

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={current}
        onChange={e => {
          const next = e.target.value as Lang
          router.push(switchLangPath(pathname, next))
        }}
        aria-label={label}
        className="appearance-none rounded-full border border-[var(--color-border)] bg-white pl-3 pr-7 py-1.5 text-[12px] font-medium text-[#111827] hover:border-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
      >
        <option value="ru">RU</option>
        <option value="en">EN</option>
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </label>
  )
}
