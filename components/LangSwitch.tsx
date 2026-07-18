'use client'

import { usePathname, useRouter } from 'next/navigation'
import { switchLangPath, detectLang, LANGS, pickCopy, type Lang } from '@/lib/i18n'

const LANG_LABEL: Record<Lang, string> = { ru: 'RU', en: 'EN', id: 'ID', fr: 'FR', de: 'DE', zh: 'ZH', nl: 'NL', ban: 'BAN' }

// Same visual treatment as CurrencyToggle — appearance-none <select> with a
// chevron overlay. Keeps the header's right-side controls consistent.
export function LangSwitch({ className = '' }: { className?: string }) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const current: Lang = detectLang(pathname)
  const label = pickCopy({ ru: 'Язык', en: 'Language', id: 'Bahasa', fr: 'Langue', de: 'Sprache', zh: '语言', nl: 'Taal', ban: 'Basa' }, current)

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
        {LANGS.map(l => (
          <option key={l} value={l}>{LANG_LABEL[l]}</option>
        ))}
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
