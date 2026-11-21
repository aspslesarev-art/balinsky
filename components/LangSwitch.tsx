'use client'

import { usePathname, useRouter } from 'next/navigation'
import { switchLangPath, detectLang, LANGS, pickCopy, type Lang } from '@/lib/i18n'
import { SELECT_PLAIN } from './CurrencyContext'

// NB: `uk` is the ISO 639-1 language code for Ukrainian and must stay that way
// in hreflang and <html lang>. The URL segment and this label are both UA, so
// neither reads as "United Kingdom" — see langToSegment in lib/i18n.
const LANG_LABEL: Record<Lang, string> = { ru: 'RU', en: 'EN', id: 'ID', fr: 'FR', de: 'DE', zh: 'ZH', nl: 'NL', ban: 'BAN', pl: 'PL', uk: 'UA' }

// Самоназвания — для поля в мобильном меню, где есть место на полное имя.
export const LANG_NATIVE_NAME: Record<Lang, string> = {
  ru: 'Русский', en: 'English', id: 'Bahasa Indonesia', fr: 'Français', de: 'Deutsch',
  zh: '中文', nl: 'Nederlands', ban: 'Basa Bali', pl: 'Polski', uk: 'Українська',
}

const SELECT_PILL =
  'appearance-none rounded-full border border-[var(--color-border)] bg-white pl-3 pr-7 py-1.5 text-[12px] font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer'
const SELECT_FIELD =
  'appearance-none w-full h-11 rounded-lg border border-[#DDE2DF] bg-white pl-3 pr-10 text-[16px] text-[var(--color-text)] cursor-pointer transition-colors duration-[120ms] hover:border-[#0F1A15]'

// Same visual treatment as CurrencyToggle — appearance-none <select> with a
// chevron overlay. Keeps the header's right-side controls consistent.
// variant: 'pill' (рамка), 'plain' («RU ⌄» текстом в шапке), 'field' (на всю ширину, в мобильном меню).
export function LangSwitch({ className = '', variant = 'pill' }: { className?: string; variant?: 'pill' | 'plain' | 'field' }) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const current: Lang = detectLang(pathname)
  const label = pickCopy({ ru: 'Язык', en: 'Language', id: 'Bahasa', fr: 'Langue', de: 'Sprache', zh: '语言', nl: 'Taal', ban: 'Basa', pl: 'Język', uk: 'Мова' }, current)
  const cls = variant === 'plain' ? SELECT_PLAIN : variant === 'field' ? SELECT_FIELD : SELECT_PILL
  const chevron = variant === 'plain' ? 'right-0 text-[#6B7570]' : variant === 'field' ? 'right-3 text-[#6B7570]' : 'right-2 text-[var(--color-text-muted)]'

  return (
    <label className={`relative ${variant === 'field' ? 'flex' : 'inline-flex'} items-center ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={current}
        onChange={e => {
          const next = e.target.value as Lang
          router.push(switchLangPath(pathname, next))
        }}
        aria-label={label}
        className={cls}
      >
        {LANGS.map(l => (
          <option key={l} value={l} lang={l}>{variant === 'field' ? LANG_NATIVE_NAME[l] : LANG_LABEL[l]}</option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${chevron}`}
        width={variant === 'field' ? 16 : 12} height={variant === 'field' ? 16 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </label>
  )
}
