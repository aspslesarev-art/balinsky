'use client'

import { useState } from 'react'

type Result = { linked: number; checked: number; applied: number; confirmed: number; held: number; sold: number }

// Ручной запуск той же сверки, что идёт ночью. Нужен не столько ради
// самих цен, сколько ради кэша: страницы объектов держатся час, и после
// прогона из консоли дата «цена обновлена» доезжает до сайта не сразу.
export function SyncButton() {
  const [state, setState] = useState<'idle' | 'run' | 'done' | 'error'>('idle')
  const [res, setRes] = useState<Result | null>(null)

  return (
    <div className="flex items-center gap-3">
      <button
        disabled={state === 'run'}
        onClick={async () => {
          setState('run')
          try {
            const r = await fetch('/api/admin/market-sync', { method: 'POST' })
            const d = await r.json()
            if (d?.ok) { setRes(d as Result); setState('done') } else setState('error')
          } catch { setState('error') }
        }}
        className="text-[12px] px-3 py-1.5 rounded-lg border border-[var(--ax-border)] hover:bg-[var(--ax-bg-soft)] disabled:opacity-50"
      >
        {state === 'run' ? 'сверяю…' : 'Сверить сейчас'}
      </button>
      {state === 'done' && res && (
        <span className="text-[12px] text-[var(--ax-fg-muted)]">
          новых пар {res.linked}, цен обновлено {res.applied}, отмечено проверенными {res.confirmed}
          {res.held ? `, отложено ${res.held}` : ''} — обновите страницу
        </span>
      )}
      {state === 'error' && <span className="text-[12px] text-red-500">не получилось</span>}
    </div>
  )
}
