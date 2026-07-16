'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { pickCopy, type Lang } from '@/lib/i18n'

export type DevelopersSortKey =
  | 'balanced'
  | 'ready'
  | 'inprogress'
  | 'units-ready'
  | 'units-inprogress'
  | 'experience'
  | 'international'

type Option = { key: DevelopersSortKey; label: string; hint: string }
const OPTIONS_BY_LANG: Record<'ru' | 'en', Option[]> = {
  ru: [
    { key: 'balanced',         label: 'Сбалансированный',     hint: 'Сданные + в работе + редакторская оценка' },
    { key: 'ready',            label: 'Сданные ЖК',           hint: 'Кто реально построил больше всего' },
    { key: 'inprogress',       label: 'Активные стройки',     hint: 'У кого больше проектов сейчас в работе' },
    { key: 'units-ready',      label: 'Сданные юниты',        hint: 'По общему количеству сданных юнитов' },
    { key: 'units-inprogress', label: 'Юниты в стройке',      hint: 'По общему количеству юнитов в работе' },
    { key: 'experience',       label: 'Опыт и репутация',     hint: 'По данным о репутации, технике, опыте строительства' },
    { key: 'international',    label: '🌍 Международный опыт', hint: 'Девелоперы с историей и проектами за пределами Бали' },
  ],
  en: [
    { key: 'balanced',         label: 'Balanced',           hint: 'Completed + active + editorial score' },
    { key: 'ready',            label: 'Completed projects', hint: 'Who has actually built the most' },
    { key: 'inprogress',       label: 'Active projects',    hint: 'Who has the most ongoing builds' },
    { key: 'units-ready',      label: 'Delivered units',    hint: 'By total number of delivered units' },
    { key: 'units-inprogress', label: 'Units under build',  hint: 'By total number of units currently under construction' },
    { key: 'experience',       label: 'Experience',         hint: 'By depth of editorial data on reputation and team' },
    { key: 'international',    label: '🌍 International',   hint: 'Developers with projects outside Bali' },
  ],
}

export function DevelopersSortToggle({ current, lang = 'ru' }: { current: DevelopersSortKey; lang?: Lang }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const apply = (key: DevelopersSortKey) => {
    const next = new URLSearchParams(searchParams.toString())
    if (key === 'balanced') next.delete('sort')
    else next.set('sort', key)
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }

  const options = pickCopy(OPTIONS_BY_LANG, lang)
  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          onClick={() => apply(o.key)}
          title={o.hint}
          className={`text-[13px] px-3.5 py-1.5 rounded-full border transition-colors ${
            current === o.key
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-medium'
              : 'bg-white border-[var(--color-border)] text-[#111827] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
