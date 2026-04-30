import { ChevronDown } from 'lucide-react'

export function FilterPill({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#D1D1CF] transition-colors"
    >
      {label}
      <ChevronDown size={16} strokeWidth={2} className="text-[var(--color-text-muted)]" />
    </button>
  )
}
