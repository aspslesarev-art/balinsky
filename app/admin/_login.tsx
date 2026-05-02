'use client'

import { useState } from 'react'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (r.ok) { window.location.href = '/admin/chats'; return }
      setError(r.status === 401 ? 'Неверные данные' : 'Ошибка входа')
    } catch {
      setError('Сеть недоступна')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-[#1F2937] p-8 shadow-xl">
      <h1 className="text-[24px] font-semibold mb-1">Balinsky Admin</h1>
      <p className="text-[13px] text-white/60 mb-6">Inbox для бота @BalinskyBot</p>
      <input
        type="text"
        value={username}
        onChange={e => setUsername(e.target.value)}
        autoFocus
        autoComplete="username"
        placeholder="Логин"
        className="w-full rounded-lg bg-[#111827] border border-white/10 px-4 py-3 text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--color-primary)] mb-3"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="current-password"
        placeholder="Пароль"
        className="w-full rounded-lg bg-[#111827] border border-white/10 px-4 py-3 text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--color-primary)]"
      />
      {error && <div className="mt-3 text-[13px] text-[#F87171]">{error}</div>}
      <button
        type="submit"
        disabled={busy || !username || !password}
        className="mt-4 w-full rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white font-medium py-3 disabled:opacity-50"
      >
        {busy ? 'Входим…' : 'Войти'}
      </button>
    </form>
  )
}
