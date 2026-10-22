'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INPUT =
  'w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-[15px] font-normal text-[var(--color-text)] outline-none transition-colors duration-[120ms] focus:border-[var(--color-primary)]'
const LABEL = 'flex flex-col gap-2 text-[14px] font-medium text-[var(--color-text)]'

export function EditListingForm({ id, priceUsd, comment }: { id: string; priceUsd: number; comment: string | null }) {
  const router = useRouter()
  const [price, setPrice] = useState(String(priceUsd))
  const [text, setText] = useState(comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const p = Number(price.replace(/[^\d.]/g, ''))
    if (!Number.isFinite(p) || p <= 0) { setError('Укажите цену в долларах'); return }
    setSaving(true)
    try {
      const r = await fetch(`/api/kabinet/listings/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priceUsd: p, comment: text }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setError(j.error ?? 'Не удалось сохранить')
        return
      }
      router.push('/kabinet/objekty')
      router.refresh()
    } catch {
      setError('Сеть недоступна')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-white p-6">
        <label className={LABEL}>Цена, $
          <input value={price} onChange={e => setPrice(e.target.value)} inputMode="numeric" className={INPUT} />
        </label>
        <label className={LABEL}>Комментарий
          <textarea value={text} onChange={e => setText(e.target.value)} rows={5} maxLength={2000}
            placeholder="Условия сделки, что важно знать покупателю, срок актуальности цены" className={INPUT} />
        </label>
      </section>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving}
          className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-6 py-3 text-[15px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
          {saving ? 'Сохраняю…' : 'Сохранить'}
        </button>
        {error && <span className="text-[14px] text-red-700" role="alert">{error}</span>}
      </div>
    </form>
  )
}
