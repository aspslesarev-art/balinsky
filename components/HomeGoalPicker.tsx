'use client'
// Первый экран главной: «Жить / Сдавать / И то, и другое» + «Подобрать дом».
// Выбор цели меняет, куда ведёт кнопка (каталог вилл с отбором под цель).
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const GOALS = [
  { key: 'live', label: 'Жить', href: '/ru/villy?goal=live' },
  { key: 'invest', label: 'Сдавать', href: '/ru/villy?goal=invest' },
  { key: 'both', label: 'И то, и другое', href: '/ru/villy?goal=invest' },
] as const

export function HomeGoalPicker() {
  const [goal, setGoal] = useState<(typeof GOALS)[number]['key']>('live')
  const href = GOALS.find(g => g.key === goal)!.href
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
      <div role="group" aria-label="Зачем вам дом" className="inline-flex max-w-full rounded-full bg-[#F5F5F7] p-1">
        {GOALS.map(g => (
          <button key={g.key} type="button" aria-pressed={goal === g.key} onClick={() => setGoal(g.key)}
            className={`min-h-12 cursor-pointer whitespace-nowrap rounded-full px-4 text-[15px] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] sm:px-[22px] sm:text-[16px] ${goal === g.key ? 'bg-white font-semibold text-[#1D1D1F] shadow-[0_1px_2px_rgb(0_0_0/.06),0_2px_8px_rgb(0_0_0/.06)]' : 'font-medium text-[#6E6E73] hover:text-[#1D1D1F]'}`}>
            {g.label}
          </button>
        ))}
      </div>
      <Link href={href}
        className="inline-flex min-h-14 items-center gap-2.5 rounded-full bg-[var(--color-primary)] px-7 text-[17px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
        Подобрать дом <ArrowRight size={18} aria-hidden />
      </Link>
    </div>
  )
}
