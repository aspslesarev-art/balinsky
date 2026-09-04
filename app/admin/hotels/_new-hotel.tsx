'use client'

import { useState } from 'react'

// Новый отель. Код смены генерирует сервер и показывает ровно один раз —
// дальше его видно на странице отеля, но перевыпуск всё равно в одну кнопку.
export function NewHotelForm() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [address, setAddress] = useState('')
  const [lang, setLang] = useState<'en' | 'ru'>('en')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/admin/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, address, lang }),
      })
      if (r.ok) { window.location.href = `/admin/hotels/${slug.trim().toLowerCase()}`; return }
      const { error: code } = await r.json().catch(() => ({ error: 'failed' }))
      setError(code === 'slug_taken' ? 'Такой код отеля уже занят' : 'Не сохранилось')
    } catch {
      setError('Сеть недоступна')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-[14px] font-medium text-white"
      >
        Добавить отель
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-5">
      <div className="grid gap-2 md:grid-cols-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          placeholder="Название («Kuta Beach Hotel»)"
          className="rounded-xl border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] px-3.5 py-2.5 text-[15px] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]"
        />
        <input
          value={slug}
          onChange={e => setSlug(e.target.value)}
          autoCapitalize="none"
          placeholder="Код отеля латиницей («kuta-beach»)"
          className="rounded-xl border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] px-3.5 py-2.5 text-[15px] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]"
        />
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Адрес (необязательно)"
          className="rounded-xl border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] px-3.5 py-2.5 text-[15px] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]"
        />
        <select
          value={lang}
          onChange={e => setLang(e.target.value === 'ru' ? 'ru' : 'en')}
          className="rounded-xl border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] px-3.5 py-2.5 text-[15px] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]"
        >
          <option value="en">Язык страницы гостя: английский</option>
          <option value="ru">Язык страницы гостя: русский</option>
        </select>
      </div>
      {error && <div className="mt-3 text-[13px] text-[var(--ax-error-fg)]">{error}</div>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy || !name.trim() || !slug.trim()}
          className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Сохраняем…' : 'Создать'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-[var(--ax-border)] px-4 py-2.5 text-[14px] text-[var(--ax-fg-muted)]"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}
