'use client'
// «Будет ли спрос?»: переключатель «Помесячно / Посуточно / Продаются рядом» —
// видна одна лента карточек, а не три подряд. Все панели остаются в разметке
// (скрытые — через hidden), чтобы их видели поисковики.
import { useState, type ReactNode } from 'react'

export function DemandTabs({ tabs, label }: { tabs: { key: string; label: string; content: ReactNode }[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.key)
  if (!tabs.length) return null
  return (
    <div>
      {tabs.length > 1 && (
        <div role="tablist" aria-label={label} className="mb-4 inline-flex max-w-full overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white p-1 [scrollbar-width:none]">
          {tabs.map(t => (
            <button key={t.key} type="button" role="tab" id={`demand-tab-${t.key}`} aria-controls={`demand-panel-${t.key}`} aria-selected={active === t.key}
              onClick={() => setActive(t.key)}
              className={`min-h-[40px] shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 sm:px-4 text-[14px] font-semibold transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${active === t.key ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {tabs.map(t => (
        <div key={t.key} role="tabpanel" id={`demand-panel-${t.key}`} aria-labelledby={`demand-tab-${t.key}`} hidden={active !== t.key}>
          {t.content}
        </div>
      ))}
    </div>
  )
}
