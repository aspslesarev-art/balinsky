function colorFor(pct: number): string {
  if (pct <= 20) return 'var(--color-progress-low)'
  if (pct <= 60) return 'var(--color-progress-mid)'
  return 'var(--color-progress-hi)'
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
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
