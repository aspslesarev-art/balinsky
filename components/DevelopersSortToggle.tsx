'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export type DevelopersSortKey = 'balanced' | 'ready' | 'inprogress' | 'experience'

const OPTIONS: { key: DevelopersSortKey; label: string; hint: string }[] = [
  { key: 'balanced',   label: 'Сбалансированный', hint: 'Сданные + в работе + редакторская оценка' },
  { key: 'ready',      label: 'Сданные ЖК',       hint: 'Кто реально построил больше всего' },
  { key: 'inprogress', label: 'Активные стройки', hint: 'У кого больше проектов сейчас в работе' },
  { key: 'experience', label: 'Опыт и репутация', hint: 'По данным о репутации, технике, опыте строительства' },
]

export function DevelopersSortToggle({ current }: { current: DevelopersSortKey }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const apply = (key: DevelopersSortKey) => {
    const next = new URLSearchParams(searchParams.toString())
    if (key === 'balanced') next.delete('sort')
    else next.set('sort', key)
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }

  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {OPTIONS.map(o => (
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
