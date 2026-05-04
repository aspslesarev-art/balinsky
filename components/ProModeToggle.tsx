'use client'

import { useProMode } from './ProModeContext'

export function ProModeToggle({ className = '' }: { className?: string }) {
  const { pro, setPro, ready } = useProMode()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pro}
      onClick={() => setPro(!pro)}
      className={`inline-flex items-center gap-2 group ${className}`}
      title={pro ? 'Pro: показываю аналитику на странице объекта' : 'Pro выключен — аналитика скрыта'}
    >
      <span className="text-[12px] font-semibold text-[#111827] group-hover:text-[var(--color-primary)] transition-colors">Pro</span>
      <span
        className={`relative inline-block w-8 h-4 rounded-full transition-colors ${
          ready && pro ? 'bg-[var(--color-primary)]' : 'bg-[#D1D5DB]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-all ${
            ready && pro ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}
