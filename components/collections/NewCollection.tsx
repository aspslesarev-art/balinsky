'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

// «Новая подборка»: имя клиента → создаём и сразу открываем её.

export function NewCollection() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    const r = await fetch('/api/collections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: name.trim() }) }).catch(() => null)
    if (!r?.ok) { setBusy(false); setError('Не получилось создать. Попробуйте ещё раз.'); return }
    const { collection } = await r.json() as { collection: { id: string } }
    router.push(`/kabinet/podborki/${collection.id}`)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-3 text-[15px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
        <Plus size={16} strokeWidth={2.25} aria-hidden /> Новая подборка
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-white p-4 sm:flex-row sm:items-center">
      <label htmlFor="new-collection" className="sr-only">Имя клиента или название подборки</label>
      <input id="new-collection" autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={120}
        placeholder="Например: Иван - до $300k, Чангу"
        className="h-12 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] px-3 text-[16px] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" />
      <div className="flex gap-2">
        <button type="submit" disabled={!name.trim() || busy}
          className="h-12 flex-1 cursor-pointer rounded-lg bg-[var(--color-primary)] px-5 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
          {busy ? 'Создаю…' : 'Создать'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setName('') }}
          className="h-12 cursor-pointer rounded-lg px-4 text-[15px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]">
          Отмена
        </button>
      </div>
      {error && <p role="alert" className="text-[14px] text-[#8A1F14]">{error}</p>}
    </form>
  )
}
