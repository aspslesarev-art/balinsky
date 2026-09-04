'use client'

import { useState } from 'react'

export function DeskLogin() {
  const [slug, setSlug] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/hotel-desk/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.trim().toLowerCase(), code: code.trim() }),
      })
      if (r.ok) {
        const { slug: ok } = await r.json()
        window.location.href = `/hotel-desk/${ok}`
        return
      }
      setError(r.status === 401 ? 'Отель или код не подошли' : 'Ошибка входа')
    } catch {
      setError('Сеть недоступна')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen min-w-0 items-center justify-center bg-neutral-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
        <h1 className="text-[22px] font-semibold">Стойка</h1>
        <p className="mb-6 mt-1 text-[13px] text-neutral-500">Заявки и переписка с гостями отеля.</p>
        <input
          value={slug}
          onChange={e => setSlug(e.target.value)}
          autoFocus
          autoCapitalize="none"
          placeholder="Код отеля (например, kuta-beach)"
          className="mb-2 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-neutral-900"
        />
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Код смены"
          className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-neutral-900"
        />
        {error && <div className="mt-3 text-[13px] text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={busy || !slug.trim() || !code.trim()}
          className="mt-4 w-full rounded-xl bg-neutral-900 py-3 text-[15px] font-medium text-white disabled:opacity-40"
        >
          {busy ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
