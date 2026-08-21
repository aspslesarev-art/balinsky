'use client'

// Поиск в hero главной страницы. Пришёл на смену HeroBalinaSearch после
// того, как онлайн-консультанта выключили (см. lib/consultant-flag.ts):
// запрос уходит не в чат, а прямо в каталог — /<lang>/villy?q=… или
// /<lang>/apartamenty?q=…, то есть в тот же поиск, что и на страницах
// каталога. Это сохраняет транзакционный сценарий «купить», под который
// перешита главная.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight } from 'lucide-react'
import { switchLangPath, t, type Lang } from '@/lib/i18n'

type Suggestion = { label: string; href?: string }
type Kind = 'villy' | 'apartamenty'

// Те же плейсхолдеры, что в каталогах вилл и апартаментов.
const PLACEHOLDER: Record<Lang, string> = {
  ru: 'Поиск по виллам, апартаментам, районам, застройщикам…',
  en: 'Search villas, apartments, districts, developers…',
  id: 'Cari vila, apartemen, area, pengembang…',
  fr: 'Rechercher villas, appartements, quartiers, promoteurs…',
  de: 'Villen, Apartments, Regionen, Bauträger suchen…',
  zh: '搜索别墅、公寓、地区、开发商…',
  nl: "Zoek villa's, appartementen, wijken, ontwikkelaars…",
  ban: 'Rereh vila, apartemen, wewengkon, pangwangun…',
  pl: 'Szukaj willi, apartamentów, dzielnic, deweloperów…',
  uk: 'Пошук вілл, апартаментів, районів, забудовників…',
}

function catalogPath(kind: Kind, lang: Lang): string {
  return switchLangPath(`/ru/${kind}`, lang)
}

export function HeroCatalogSearch({
  lang,
  tryLabel,
  suggestions,
  sendAria,
}: {
  lang: Lang
  tryLabel: string
  suggestions: readonly Suggestion[]
  sendAria: string
}) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [kind, setKind] = useState<Kind>('villy')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    const base = catalogPath(kind, lang)
    router.push(q ? `${base}?q=${encodeURIComponent(q)}` : base)
  }

  const tab = (active: boolean) =>
    `px-4 py-2 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
      active
        ? 'bg-white text-[#0E1A14]'
        : 'bg-white/12 text-white/85 hover:bg-white/20'
    }`

  return (
    <>
      <div className="flex items-center gap-2 mb-3" data-llm-skip="">
        <button type="button" className={tab(kind === 'villy')} onClick={() => setKind('villy')}>
          {t('nav.villas', lang)}
        </button>
        <button type="button" className={tab(kind === 'apartamenty')} onClick={() => setKind('apartamenty')}>
          {t('nav.apartments', lang)}
        </button>
      </div>

      <form onSubmit={submit} className="relative" data-llm-skip="">
        <Search size={18} strokeWidth={1.8} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6B7570] pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={PLACEHOLDER[lang]}
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-12 pr-16 py-4 md:py-5 text-[15px] md:text-[16px] rounded-2xl bg-white border border-[#D5DDD8] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-shadow shadow-[0_1px_2px_rgba(0,0,0,0.03)] placeholder:text-[#9CA59F] text-[#0E1A14]"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#0E1A14] text-white hover:bg-[#1F2C25] transition-colors"
          aria-label={sendAria}
        >
          <ArrowRight size={16} />
        </button>
      </form>

      <div className="mt-3 text-[12.5px] text-white/75 flex items-baseline flex-wrap gap-x-2 gap-y-1.5" data-llm-skip="">
        <span className="uppercase tracking-wider text-[11px] text-white/55">{tryLabel}:</span>
        {suggestions.map((s, i) => (
          <Link
            key={i}
            href={switchLangPath(s.href ?? '/ru/villy', lang)}
            className="text-white/85 underline decoration-white/30 underline-offset-2 hover:decoration-white hover:text-white transition-colors"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </>
  )
}
