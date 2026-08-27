'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { MarketAccessRow } from '@/lib/market/access'

// Кому открыт отчёт /rynok. Выдача по @нику или числовому id, отзыв — по строке.

export function AccessList({ rows }: { rows: MarketAccessRow[] }) {
  const router = useRouter()
  const [handle, setHandle] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function post(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/market-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!d?.ok) {
        setError(typeof d?.error === 'string' ? d.error : 'не получилось')
        return false
      }
      router.refresh()
      return true
    } catch {
      setError('сеть недоступна')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function grant(e: React.FormEvent) {
    e.preventDefault()
    if (!handle.trim()) return
    if (await post({ handle, note })) {
      setHandle('')
      setNote('')
    }
  }

  const live = rows.filter(r => !r.revoked_at)
  const revoked = rows.filter(r => r.revoked_at)

  return (
    <div className="space-y-6">
      <form onSubmit={grant} className="flex flex-wrap items-center gap-2">
        <input
          value={handle}
          onChange={e => setHandle(e.target.value)}
          placeholder="@ник или id"
          className="w-44 rounded-lg border border-[var(--ax-border)] bg-transparent px-3 py-1.5 text-[13px] outline-none focus:border-[var(--ax-fg-muted)]"
        />
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="кто это (заметка)"
          className="w-64 rounded-lg border border-[var(--ax-border)] bg-transparent px-3 py-1.5 text-[13px] outline-none focus:border-[var(--ax-fg-muted)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-[var(--ax-border)] px-3 py-1.5 text-[13px] hover:bg-[var(--ax-bg-soft)] disabled:opacity-50"
        >
          Выдать доступ
        </button>
        {error && <span className="text-[12px] text-red-500">{error}</span>}
      </form>

      {live.length ? (
        <ul className="text-[13px]">
          {live.map(r => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--ax-border)] py-2 first:border-t-0">
              <span className="min-w-0 flex-1 basis-[200px]">
                <span className="font-medium">{label(r)}</span>
                {r.note ? <span className="text-[var(--ax-fg-muted)]"> — {r.note}</span> : null}
              </span>
              <span className="text-[12px] text-[var(--ax-fg-muted)]">с {day(r.created_at)}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void post({ revokeId: r.id })}
                className="text-[12px] text-[var(--ax-fg-muted)] underline hover:text-red-500 disabled:opacity-50"
              >
                отозвать
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[13px] text-[var(--ax-fg-muted)]">
          Пока никому не выдано — отчёт видите только вы через админку.
        </div>
      )}

      {revoked.length ? (
        <div>
          <div className="mb-1 text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)]">Отозванные</div>
          <ul className="text-[13px] text-[var(--ax-fg-muted)]">
            {revoked.map(r => (
              <li key={r.id} className="border-t border-[var(--ax-border)] py-1.5 first:border-t-0">
                {label(r)}
                {r.note ? ` — ${r.note}` : ''} · отозван {day(r.revoked_at!)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function label(r: MarketAccessRow): string {
  return r.username ? `@${r.username}` : `id ${r.telegram_id}`
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}
