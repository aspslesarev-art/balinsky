'use client'

import { useIntent, type Intent } from './IntentContext'

const OPTIONS: { v: Intent; label: string; short: string }[] = [
  { v: 'all',    label: 'Все',         short: 'Все' },
  { v: 'invest', label: 'Инвестиции',  short: 'Инвест' },
  { v: 'live',   label: 'Для жизни',   short: 'Жизнь' },
]

export function IntentToggle({ className = '' }: { className?: string }) {
  const { intent, setIntent, ready } = useIntent()
  return (
    <div
      className={`inline-flex rounded-full border border-[var(--color-border)] p-0.5 bg-white ${className}`}
      role="tablist"
      aria-label="Цель подбора"
    >
      {OPTIONS.map(opt => {
        const isActive = ready && intent === opt.v
        return (
          <button
            key={opt.v}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setIntent(opt.v)}
            className={`text-[11px] sm:text-[12px] font-medium px-2.5 sm:px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[#111827]'
            }`}
          >
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.short}</span>
          </button>
        )
      })}
    </div>
  )
}
