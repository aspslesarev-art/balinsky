'use client'

import { useMemo, useState } from 'react'
import type { ProUser } from '@/lib/pro-access'

// Список людей с переключателем Pro. Переключатель срабатывает сразу:
// включил — доступ открыт и человеку уходит сообщение; выключил — «без Pro».

type Filter = 'all' | 'pending' | 'granted' | 'denied'

const name = (u: ProUser) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : u.email ?? 'Без имени')
const initial = (u: ProUser) => (u.first_name || u.username || u.email || '?').trim().charAt(0).toUpperCase()
const date = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Makassar' })

export function ProAdmin({ initial: start }: { initial: ProUser[] }) {
  const [users, setUsers] = useState(start)
  const [filter, setFilter] = useState<Filter>('all')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState<number | 'form' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const counts = useMemo(() => ({
    all: users.length,
    pending: users.filter(u => u.pro === 'pending').length,
    granted: users.filter(u => u.pro === 'granted').length,
    denied: users.filter(u => u.pro === 'denied').length,
  }), [users])
  const shown = filter === 'all' ? users : users.filter(u => u.pro === filter)

  const upsert = (u: ProUser) => setUsers(list => list.some(x => x.telegram_id === u.telegram_id)
    ? list.map(x => x.telegram_id === u.telegram_id ? u : x)
    : [u, ...list])

  async function post(body: unknown): Promise<{ ok: boolean; user?: ProUser; error?: string }> {
    try {
      const r = await fetch('/api/admin/pro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      return await r.json()
    } catch {
      return { ok: false, error: 'Нет связи с сервером' }
    }
  }

  async function toggle(u: ProUser) {
    setBusy(u.telegram_id)
    setMsg(null)
    const r = await post({ id: u.telegram_id, status: u.pro === 'granted' ? 'denied' : 'granted' })
    if (r.ok && r.user) upsert(r.user)
    else setMsg({ ok: false, text: r.error ?? 'Не получилось сохранить' })
    setBusy(null)
  }

  async function grant(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim()) return
    setBusy('form')
    setMsg(null)
    const r = await post({ contact })
    if (r.ok && r.user) {
      upsert(r.user)
      setMsg({ ok: true, text: `Pro открыт: ${name(r.user)}` })
      setContact('')
    } else setMsg({ ok: false, text: r.error ?? 'Не получилось сохранить' })
    setBusy(null)
  }

  const TABS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Все' }, { key: 'pending', label: 'Ждут решения' }, { key: 'granted', label: 'С Pro' }, { key: 'denied', label: 'Без Pro' },
  ]

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 py-8 sm:px-6">
      <form onSubmit={grant} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input value={contact} onChange={e => setContact(e.target.value)} placeholder="почта или @telegram" aria-label="Почта или @telegram"
          className="w-full rounded-lg border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] px-4 py-2.5 text-[14px] text-[var(--ax-fg)] outline-none focus:border-[#1F8B5F] sm:w-[280px]" />
        <button type="submit" disabled={busy === 'form'}
          className="cursor-pointer rounded-lg bg-[#1F8B5F] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[#197551] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F8B5F] disabled:cursor-default disabled:opacity-60">
          {busy === 'form' ? 'Сохраняю…' : 'Дать Pro'}
        </button>
        {msg && <span role="status" className={`text-[14px] ${msg.ok ? 'text-[#1F8B5F]' : 'text-[var(--ax-error-fg)]'}`}>{msg.text}</span>}
      </form>

      <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map(t => (
          <button key={t.key} type="button" role="tab" aria-selected={filter === t.key} onClick={() => setFilter(t.key)}
            className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-[#1F8B5F] ${filter === t.key ? 'bg-[var(--ax-fg)] text-[var(--ax-bg)]' : 'border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)]'}`}>
            {t.label} · {counts[t.key]}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)]">
        {shown.length === 0 && <p className="px-6 py-8 text-[14px] text-[var(--ax-fg-muted)]">Здесь пока никого.</p>}
        {shown.map(u => {
          const on = u.pro === 'granted'
          const contactLine = [u.telegram_id > 0 ? (u.username ? `@${u.username}` : 'Telegram') : (u.email ?? 'почта'), date(u.created_at)].join(' · ')
          return (
            <div key={u.telegram_id} className="flex items-center gap-3 border-b border-[var(--ax-border-soft)] px-4 py-3 last:border-b-0 sm:gap-4 sm:px-6">
              <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white ${u.pro === 'pending' ? 'bg-[#E8833A]' : on ? 'bg-[#1F8B5F]' : 'bg-[#8A958F]'}`}>{initial(u)}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold text-[var(--ax-fg)]">{name(u)}</span>
                <span className="truncate text-[13px] text-[var(--ax-fg-muted)]">
                  {u.telegram_id > 0 && u.username
                    ? <a href={`https://t.me/${u.username}`} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{contactLine}</a>
                    : contactLine}
                </span>
              </span>
              {u.pro === 'pending' && <span className="hidden shrink-0 rounded-full bg-[#FDF3E1] px-2.5 py-0.5 text-[13px] font-medium text-[#7A4B0B] sm:inline">Ждёт</span>}
              {u.is_agent && <span className="hidden shrink-0 rounded-full bg-[#E2F0E8] px-2.5 py-0.5 text-[13px] font-medium text-[#135E40] sm:inline">Агент</span>}
              <span className="hidden w-[96px] shrink-0 text-right text-[13px] text-[var(--ax-fg-muted)] sm:inline">{on ? 'Pro' : u.pro === 'pending' ? 'Ждёт решения' : 'Без Pro'}</span>
              <button type="button" role="switch" aria-checked={on} aria-label={`Pro для ${name(u)}`} disabled={busy === u.telegram_id} onClick={() => toggle(u)}
                className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F8B5F] disabled:cursor-default disabled:opacity-60 ${on ? 'bg-[#1F8B5F]' : 'bg-[#C9D2CE]'}`}>
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-[120ms] ${on ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          )
        })}
      </section>

      <p className="text-[13px] text-[var(--ax-fg-muted)]">
        Переключатель срабатывает сразу. Когда Pro открыт, человеку приходит сообщение в Telegram или на почту. О новом человеке пишет бот - там тоже можно нажать «Дать Pro».
      </p>
    </main>
  )
}
