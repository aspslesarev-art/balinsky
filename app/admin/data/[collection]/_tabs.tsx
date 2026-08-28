// Переключатель «Таблица / Проблемы» в шапке базы.
//
// Таблица показывает данные, вкладка «Проблемы» — их дыры: где объекта
// фактически нет на сайте и что для этого нужно дозаполнить
// (lib/admin/data-quality.ts).

import type { Severity } from '@/lib/admin/data-quality'

const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] no-underline whitespace-nowrap border'
const on = 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--ax-hover)]'
const off = 'border-transparent text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]'

export function DataTabs({
  collection,
  active,
  counts,
}: {
  collection: string
  active: 'grid' | 'issues'
  /** Сколько записей с проблемами по важности; null — вкладки нет. */
  counts: Record<Severity, number> | null
}) {
  if (!counts) return null
  const critical = counts.critical
  const total = counts.critical + counts.warning
  return (
    <div className="flex items-center gap-1">
      <a href={`/admin/data/${collection}`} className={`${base} ${active === 'grid' ? on : off}`}>Таблица</a>
      <a href={`/admin/data/${collection}/issues`} className={`${base} ${active === 'issues' ? on : off}`}>
        Проблемы
        {total > 0 && (
          <span className={`px-1.5 rounded-md text-[11px] font-semibold ${
            critical > 0 ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-600'
          }`}>
            {total}
          </span>
        )}
      </a>
    </div>
  )
}
