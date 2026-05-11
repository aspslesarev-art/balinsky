'use client'

import { useState, type ReactNode } from 'react'

export function DevTabs({
  byProjects, allUnits, unitCount,
}: {
  byProjects: ReactNode
  allUnits: ReactNode
  unitCount: number
}) {
  const [tab, setTab] = useState<'projects' | 'units'>('projects')
  const cls = (active: boolean) =>
    `px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
      active
        ? 'bg-[#1F8B5F] text-white'
        : 'bg-white text-[#374151] border border-[#E5E7EB] hover:border-[#1F8B5F]'
    }`
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-5">
        <button type="button" onClick={() => setTab('projects')} className={cls(tab === 'projects')}>
          По проектам
        </button>
        <button type="button" onClick={() => setTab('units')} className={cls(tab === 'units')}>
          Все юниты {unitCount > 0 && <span className="opacity-70">({unitCount})</span>}
        </button>
      </div>
      {tab === 'projects' ? byProjects : allUnits}
    </>
  )
}
