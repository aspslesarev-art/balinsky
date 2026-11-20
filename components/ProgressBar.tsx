function colorFor(pct: number): string {
  if (pct <= 20) return 'var(--color-progress-low)'
  if (pct <= 60) return 'var(--color-progress-mid)'
  return 'var(--color-progress-hi)'
}

export function ProgressBar({ value, inline = false }: { value: number; inline?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  // В строку с подписью: полоса и проценты на одной линии (карточка ЖК, 20.11.2026).
  if (inline) return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colorFor(pct) }} />
      </div>
      <span className="shrink-0 text-[14px] font-semibold tabular-nums text-[#0F1A15]">{pct}%</span>
    </div>
  )
  return (
    <div>
      <div className="h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: colorFor(pct) }}
        />
      </div>
      <div className="mt-2 text-right text-[15px] font-medium text-[var(--color-text)]">
        {pct}%
      </div>
    </div>
  )
}
