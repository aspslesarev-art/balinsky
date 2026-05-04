'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { switchLangPath, type Lang } from '@/lib/i18n'

// Two pill buttons RU / EN. Clicking switches the locale segment of the
// current URL. Same convention as the Pro mode toggle next to it: a
// rounded-full container with the active option white-on-bg.
export function LangSwitch({ className = '' }: { className?: string }) {
  const pathname = usePathname() ?? '/'
  const current: Lang = pathname.startsWith('/en') ? 'en' : 'ru'

  return (
    <div className={`inline-flex items-center gap-0.5 rounded-full bg-[var(--color-search-bg)] p-[3px] ${className}`}>
      {(['RU', 'EN'] as const).map(l => {
        const lang = l.toLowerCase() as Lang
        const active = current === lang
        const href = switchLangPath(pathname, lang)
        return (
          <Link
            key={l}
            href={href}
            className={`px-2.5 py-1 rounded-full text-[12px] font-semibold transition-colors no-underline ${
              active
                ? 'bg-white text-[#1A1F1C] shadow-[0_1px_2px_rgba(20,25,22,0.05)]'
                : 'text-[var(--color-text-muted)] hover:text-[#1A1F1C]'
            }`}
            aria-current={active ? 'true' : undefined}
            prefetch={false}
          >
            {l}
          </Link>
        )
      })}
    </div>
  )
}
