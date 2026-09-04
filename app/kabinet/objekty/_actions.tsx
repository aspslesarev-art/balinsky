'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Удаление своего объекта. Ставит статус archived (сама строка остаётся в
// базе): объект пропадает из каталога и со страницы, но история того, что
// агент публиковал, не теряется.

export function DeleteListingButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async () => {
    setBusy(true); setError(null)
    try {
      const r = await fetch(`/api/kabinet/listings/${id}`, { method: 'DELETE' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setError(j.error ?? 'Не удалось удалить')
        return
      }
      router.refresh()
    } catch {
      setError('Сеть недоступна')
    } finally {
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[14px] text-[var(--color-text-muted)] underline"
      >
        Удалить
      </button>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-3 text-[14px]">
      <span className="text-[#111827]">Удалить «{title}»?</span>
      <button type="button" onClick={remove} disabled={busy} className="font-medium text-red-700 underline disabled:opacity-60">
        {busy ? 'Удаляю…' : 'Да, удалить'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-[var(--color-text-muted)] underline">
        Отмена
      </button>
      {error && <span className="text-red-700">{error}</span>}
    </span>
  )
}
