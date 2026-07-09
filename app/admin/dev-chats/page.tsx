// Admin overview: developer ↔ Telegram-chat links.
//   - Every developer with a ✓/— for "lead chat linked?"
//   - Every Telegram group the bot sits in, and which developer (if any)
//     it's wired to — so unassigned chats are obvious.
// Read-only: actual linking is done in /admin/data → Застройщики
// (field «Telegram chat заявок»).

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { LoginForm } from '../_login'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Чаты застройщиков' }

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type Dev = { name: string; slug: string | null; chatId: string | null; published: boolean }
type Chat = { chatId: string; title: string; type: string }

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

async function loadDevelopers(): Promise<Dev[]> {
  const { data } = await sb
    .from('raw_developers')
    .select(`telegram_chat_id, name:data->Developer, slug:data->"SEO:Slug", published:data->"Публикация"`)
    .limit(500)
  const rows = (data ?? []) as { telegram_chat_id: string | null; name: unknown; slug: unknown; published: unknown }[]
  return rows
    .map(r => ({
      name: firstString(r.name) ?? '—',
      slug: firstString(r.slug),
      chatId: (r.telegram_chat_id ?? '').trim() || null,
      published: r.published === true,
    }))
    .filter(d => d.name !== '—')
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

async function loadChats(): Promise<Chat[]> {
  const { data } = await sb
    .from('bot_chats')
    .select('chat_id, title, chat_type')
    .in('chat_type', ['group', 'supergroup'])
    .order('title', { ascending: true })
  const rows = (data ?? []) as { chat_id: number; title: string | null; chat_type: string }[]
  return rows.map(r => ({ chatId: String(r.chat_id), title: r.title ?? '(без названия)', type: r.chat_type }))
}

export default async function DevChatsPage() {
  if (!(await requireAdmin())) return <LoginForm />

  const [devs, chats] = await Promise.all([loadDevelopers(), loadChats()])

  const chatTitleById = new Map(chats.map(c => [c.chatId, c.title]))
  // Which developer each chat is assigned to (by telegram_chat_id).
  const devByChatId = new Map<string, string>()
  for (const d of devs) if (d.chatId) devByChatId.set(d.chatId, d.name)

  const linked = devs.filter(d => d.chatId)
  const unlinked = devs.filter(d => !d.chatId)
  const freeChats = chats.filter(c => !devByChatId.has(c.chatId))

  // Unlinked developers first (actionable), then linked.
  const devOrder = [...unlinked, ...linked]

  return (
    <div className="min-h-screen bg-[var(--ax-bg)] text-[var(--ax-fg)] p-6 sm:p-10">
      <main className="max-w-[1100px] mx-auto space-y-8">
        <header>
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1">Заявки → Telegram</div>
          <h1 className="text-[24px] font-semibold tracking-tight">Чаты застройщиков</h1>
          <p className="text-[13px] text-[var(--ax-fg-muted)] mt-2 max-w-[680px]">
            Привязка редактируется в <Link href="/admin/data" className="underline">Базы → Застройщики</Link> (поле «Telegram chat заявок»).
            Заявка с сайта уходит в чат застройщика + копия в админ-чат.
          </p>
        </header>

        <section className="grid grid-cols-3 gap-3">
          <Kpi label="Привязано" value={`${linked.length} / ${devs.length}`} />
          <Kpi label="Без чата" value={String(unlinked.length)} />
          <Kpi label="Свободных чатов" value={String(freeChats.length)} />
        </section>

        {/* DEVELOPERS */}
        <section className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-5">
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-3">
            Застройщики ({devs.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[var(--ax-fg-muted)] border-b border-[var(--ax-border-soft)]">
                  <th className="py-2 font-medium w-[44px]">Чат</th>
                  <th className="py-2 font-medium">Застройщик</th>
                  <th className="py-2 font-medium">Чат / chat_id</th>
                </tr>
              </thead>
              <tbody>
                {devOrder.map(d => (
                  <tr key={d.slug ?? d.name} className="border-b border-[var(--ax-border-soft)] last:border-0">
                    <td className="py-2 text-center">
                      {d.chatId
                        ? <span className="text-[#1F8B5F] font-semibold" title="Чат привязан">✓</span>
                        : <span className="text-[var(--ax-fg-faint)]" title="Чат не привязан">—</span>}
                    </td>
                    <td className="py-2">
                      {d.slug
                        ? <Link href={`/ru/zastrojshhiki/${d.slug}`} className="hover:underline">{d.name}</Link>
                        : d.name}
                      {!d.published && <span className="ml-2 text-[11px] text-[var(--ax-fg-faint)]">(скрыт)</span>}
                    </td>
                    <td className="py-2 text-[var(--ax-fg-muted)]">
                      {d.chatId
                        ? <span>{chatTitleById.get(d.chatId) ?? '—'} <span className="font-mono text-[11.5px] text-[var(--ax-fg-faint)]">{d.chatId}</span></span>
                        : <span className="text-[var(--ax-fg-faint)]">не привязан</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CHATS */}
        <section className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-5">
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-3">
            Чаты с ботом ({chats.length}) — свободных: {freeChats.length}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[var(--ax-fg-muted)] border-b border-[var(--ax-border-soft)]">
                  <th className="py-2 font-medium">Название чата</th>
                  <th className="py-2 font-medium">chat_id</th>
                  <th className="py-2 font-medium">Привязан к</th>
                </tr>
              </thead>
              <tbody>
                {chats.map(c => {
                  const assigned = devByChatId.get(c.chatId)
                  return (
                    <tr key={c.chatId} className="border-b border-[var(--ax-border-soft)] last:border-0">
                      <td className="py-2">{c.title}</td>
                      <td className="py-2 font-mono text-[11.5px] text-[var(--ax-fg-muted)]">{c.chatId}</td>
                      <td className="py-2">
                        {assigned
                          ? <span className="text-[#1F8B5F]">{assigned}</span>
                          : <span className="text-[#C2410C] font-medium">свободен</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-4">
      <div className="text-[11.5px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1">{label}</div>
      <div className="text-[22px] font-semibold tracking-tight">{value}</div>
    </div>
  )
}
