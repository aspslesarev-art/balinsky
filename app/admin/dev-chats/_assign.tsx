'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export type AssignDev = {
  airtableId: string
  name: string
  slug: string | null
  chatId: string | null
  published: boolean
}
export type AssignChat = { chatId: string; title: string }

type RowState = 'idle' | 'saving' | 'saved' | 'error'

export function DevAssignTable({ devs, chats }: { devs: AssignDev[]; chats: AssignChat[] }) {
  const router = useRouter()
  // Local selection per developer so the row reflects the change instantly;
  // router.refresh() then re-syncs the chats table + counters below.
  const [sel, setSel] = useState<Record<string, string>>(
    () => Object.fromEntries(devs.map(d => [d.airtableId, d.chatId ?? ''])),
  )
  const [state, setState] = useState<Record<string, RowState>>({})

  async function save(airtableId: string, chatId: string) {
    setSel(s => ({ ...s, [airtableId]: chatId }))
    setState(s => ({ ...s, [airtableId]: 'saving' }))
    try {
      const r = await fetch('/api/admin/dev-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airtableId, chatId: chatId || null }),
      })
      if (!r.ok) throw new Error(String(r.status))
      setState(s => ({ ...s, [airtableId]: 'saved' }))
      router.refresh()
      setTimeout(() => setState(s => ({ ...s, [airtableId]: 'idle' })), 1500)
    } catch {
      setState(s => ({ ...s, [airtableId]: 'error' }))
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[var(--ax-fg-muted)] border-b border-[var(--ax-border-soft)]">
            <th className="py-2 font-medium w-[44px]">Чат</th>
            <th className="py-2 font-medium">Застройщик</th>
            <th className="py-2 font-medium">Привязать чат</th>
            <th className="py-2 font-medium w-[80px]"></th>
          </tr>
        </thead>
        <tbody>
          {devs.map(d => {
            const cur = sel[d.airtableId] ?? ''
            const st = state[d.airtableId] ?? 'idle'
            return (
              <tr key={d.airtableId} className="border-b border-[var(--ax-border-soft)] last:border-0">
                <td className="py-2 text-center">
                  {cur
                    ? <span className="text-[#1F8B5F] font-semibold" title="Чат привязан">✓</span>
                    : <span className="text-[var(--ax-fg-faint)]" title="Чат не привязан">—</span>}
                </td>
                <td className="py-2">
                  {d.slug
                    ? <Link href={`/ru/zastrojshhiki/${d.slug}`} className="hover:underline">{d.name}</Link>
                    : d.name}
                  {!d.published && <span className="ml-2 text-[11px] text-[var(--ax-fg-faint)]">(скрыт)</span>}
                </td>
                <td className="py-2">
                  <select
                    value={cur}
                    onChange={e => save(d.airtableId, e.target.value)}
                    className="max-w-full w-[320px] bg-[var(--ax-bg)] border border-[var(--ax-border)] rounded-lg px-2 py-1.5 text-[12.5px]"
                  >
                    <option value="">— не привязан —</option>
                    {chats.map(c => (
                      <option key={c.chatId} value={c.chatId}>
                        {c.title} ({c.chatId})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-[12px]">
                  {st === 'saving' && <span className="text-[var(--ax-fg-muted)]">сохраняю…</span>}
                  {st === 'saved' && <span className="text-[#1F8B5F]">✓ сохранено</span>}
                  {st === 'error' && <span className="text-[#DC2626]">ошибка</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
