'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { DISTRICT_GROUPS } from '@/lib/district-groups'

// Поиск на главной (вариант B, владелец 20.11.2026): что · где · бюджет → каталог
// с уже выставленными фильтрами. Обычные <select> — на телефоне открывают родной список.

const KINDS = [
  { v: 'villy', l: 'Виллы' },
  { v: 'apartamenty', l: 'Апартаменты' },
  { v: 'zhilye-kompleksy', l: 'Жилые комплексы' },
] as const
const AREAS: { v: string; l: string; values: readonly string[] }[] = [
  { v: '', l: 'Любой район', values: [] },
  { v: 'canggu', l: 'Чангу', values: DISTRICT_GROUPS.canggu },
  { v: 'bukit', l: 'Букит и Улувату', values: DISTRICT_GROUPS.bukit },
  { v: 'ubud', l: 'Убуд', values: DISTRICT_GROUPS.ubud },
  { v: 'sanur', l: 'Санур', values: ['Sanur'] },
  { v: 'seminyak', l: 'Семиньяк', values: ['Seminyak'] },
]
const BUDGETS = [
  { v: '', l: 'Любой' },
  { v: '150000', l: 'до $150 000' },
  { v: '300000', l: 'до $300 000' },
  { v: '500000', l: 'до $500 000' },
  { v: '1000000', l: 'до $1 000 000' },
]

function Field({ label, value, onChange, options, last }: { label: string; value: string; onChange: (v: string) => void; options: readonly { v: string; l: string }[]; last?: boolean }) {
  return (
    <label className={`relative flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 px-5 py-3 md:py-0 ${last ? '' : 'border-b border-[#ECEFED] md:border-b-0 md:border-r'}`}>
      <span className="text-[12px] text-[#6B7570]">{label}</span>
      <span className="flex items-center justify-between gap-2 text-[16px] font-semibold text-[#0F1A15]">
        <span className="truncate">{options.find(o => o.v === value)?.l}</span>
        <ChevronDown size={16} className="shrink-0 text-[#6B7570]" aria-hidden />
      </span>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label={label} className="absolute inset-0 cursor-pointer opacity-0">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}

export function HomeSearch() {
  const router = useRouter()
  const [kind, setKind] = useState<string>('villy')
  const [area, setArea] = useState('')
  const [budget, setBudget] = useState('')
  function go(e: React.FormEvent) {
    e.preventDefault()
    const sp = new URLSearchParams()
    const values = AREAS.find(a => a.v === area)?.values ?? []
    if (values.length) sp.set('district', values.join(','))
    if (budget) sp.set('price_max', budget)
    const qs = sp.toString()
    router.push(`/ru/${kind}${qs ? `?${qs}` : ''}`)
  }
  return (
    <form onSubmit={go} role="search"
      className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgb(0_0_0/.06),0_16px_40px_rgb(0_0_0/.18)] md:h-[68px] md:flex-row md:items-center md:pr-2">
      <Field label="Что" value={kind} onChange={setKind} options={KINDS} />
      <Field label="Где" value={area} onChange={setArea} options={AREAS} />
      <Field label="Бюджет" value={budget} onChange={setBudget} options={BUDGETS} last />
      <button type="submit"
        className="m-2 inline-flex h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-[var(--color-primary)] px-8 text-[16px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] md:m-0">
        Найти
      </button>
    </form>
  )
}
