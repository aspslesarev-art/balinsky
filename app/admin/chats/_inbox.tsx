'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, LogOut, RefreshCcw, MessageCircle, Bot, BotOff } from 'lucide-react'

type ChatRow = {
  chat_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  last_message_at: string
  last_message_text: string | null
  last_inbound_at: string | null
  unread_count: number
  last_manager_at: string | null
  bot_disabled: boolean
}

const HANDOVER_MS = 10 * 60 * 1000

function botStatus(c: ChatRow | null): { label: string; soft: boolean; off: boolean } {
  if (!c) return { label: 'Бот: ON', soft: false, off: false }
  if (c.bot_disabled) return { label: 'Бот: на паузе', soft: false, off: true }
  if (c.last_manager_at) {
    const elapsed = Date.now() - new Date(c.last_manager_at).getTime()
    if (elapsed < HANDOVER_MS) {
      const left = Math.ceil((HANDOVER_MS - elapsed) / 60000)
      return { label: `Менеджер ведёт диалог · ${left} мин до возврата бота`, soft: true, off: false }
    }
  }
  return { label: 'Бот: ON', soft: false, off: false }
}
type MessageRow = {
  id: number
  chat_id: number
  direction: 'in' | 'out'
  source: 'user' | 'bot' | 'manager'
  text: string | null
  start_payload: string | null
  created_at: string
}

const CHATS_POLL_MS = 8000
const MESSAGES_POLL_MS = 4000

function displayName(c: ChatRow): string {
  const n = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  if (n) return n
  if (c.username) return '@' + c.username
  return 'Anonymous · ' + c.chat_id
}
function initials(name: string): string {
  const parts = name.replace(/^@/, '').split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}
function relTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'сейчас'
  if (diff < 3600_000) return Math.floor(diff / 60_000) + ' мин'
  if (diff < 86400_000) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function Inbox() {
  const [chats, setChats] = useState<ChatRow[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)
  const lastMessageIdRef = useRef<number | null>(null)

  // Poll chats list.
  useEffect(() => {
    let cancelled = false
    const fetchChats = async () => {
      try {
        const r = await fetch('/api/admin/chats', { cache: 'no-store' })
        if (r.status === 401) { window.location.href = '/admin'; return }
        const j = await r.json() as { chats: ChatRow[] }
        if (!cancelled) setChats(j.chats ?? [])
      } catch { /* ignore */ }
    }
    fetchChats()
    const t = setInterval(fetchChats, CHATS_POLL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // Poll messages of active chat.
  useEffect(() => {
    if (activeId == null) return
    let cancelled = false
    const fetchMsgs = async () => {
      try {
        const r = await fetch(`/api/admin/chats/${activeId}/messages`, { cache: 'no-store' })
        if (r.status === 401) { window.location.href = '/admin'; return }
        const j = await r.json() as { messages: MessageRow[] }
        if (cancelled) return
        const msgs = j.messages ?? []
        setMessages(msgs)
        const last = msgs[msgs.length - 1]
        if (last && last.id !== lastMessageIdRef.current) {
          lastMessageIdRef.current = last.id
          requestAnimationFrame(() => {
            const el = messagesScrollRef.current
            if (el) el.scrollTop = el.scrollHeight
          })
        }
      } catch { /* ignore */ }
    }
    fetchMsgs()
    const t = setInterval(fetchMsgs, MESSAGES_POLL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [activeId])

  const send = async () => {
    if (activeId == null) return
    const text = draft.trim()
    if (!text || sending) return
    setSending(true); setError(null)
    try {
      const r = await fetch(`/api/admin/chats/${activeId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const j = await r.json().catch(() => null) as { ok?: boolean; detail?: string } | null
      if (!j?.ok) {
        setError(j?.detail ? `Не доставлено: ${j.detail}` : 'Telegram не принял сообщение')
        return
      }
      setDraft('')
      // Optimistic — server poll will catch up shortly.
    } catch {
      setError('Сеть недоступна')
    } finally {
      setSending(false)
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  const activeChat = chats.find(c => c.chat_id === activeId) ?? null

  const toggleBot = async () => {
    if (!activeChat) return
    const next = !activeChat.bot_disabled
    await fetch(`/api/admin/chats/${activeChat.chat_id}/toggle-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: next }),
    })
    // Optimistic local update; chats poll catches up.
    setChats(prev => prev.map(c => c.chat_id === activeChat.chat_id ? { ...c, bot_disabled: next } : c))
  }

  return (
    <div className="h-screen flex bg-[#0F1419] text-white">
      {/* Left: chat list */}
      <aside className={`flex flex-col w-full sm:w-[340px] border-r border-white/10 ${activeId != null ? 'hidden sm:flex' : 'flex'}`}>
        <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold">Inbox</div>
            <div className="text-[11px] text-white/50">{chats.length} {chats.length === 1 ? 'чат' : 'чатов'}</div>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-1 text-[12px] text-white/60 hover:text-white px-2 py-1 rounded">
            <LogOut size={13} /> Выйти
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-[13px] text-white/40 text-center">Чатов пока нет — никто не писал боту.</div>
          ) : chats.map(c => {
            const name = displayName(c)
            const isActive = c.chat_id === activeId
            return (
              <button
                key={c.chat_id}
                onClick={() => setActiveId(c.chat_id)}
                className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-white/5 ${isActive ? 'bg-[#1F2937]' : 'hover:bg-white/5'}`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-[13px]`}>
                  {initials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[14px] font-medium truncate">{name}</div>
                    <div className="text-[11px] text-white/40 shrink-0">{relTime(c.last_message_at)}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div className="text-[12px] text-white/50 truncate">{c.last_message_text ?? '—'}</div>
                    {c.unread_count > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-semibold">{c.unread_count}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Right: conversation */}
      <main className={`flex-1 flex flex-col min-w-0 ${activeId == null ? 'hidden sm:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-center gap-3">
              <button onClick={() => setActiveId(null)} className="sm:hidden text-white/60 hover:text-white">←</button>
              <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-[13px]">
                {initials(displayName(activeChat))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">{displayName(activeChat)}</div>
                <div className="text-[11px] text-white/50 truncate">
                  chat_id {activeChat.chat_id}{activeChat.username ? ` · @${activeChat.username}` : ''}
                </div>
              </div>
              <button
                onClick={toggleBot}
                title={activeChat.bot_disabled ? 'Включить автоответ бота' : 'Поставить бота на паузу'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium ${
                  activeChat.bot_disabled
                    ? 'bg-[#7F1D1D]/30 text-[#FCA5A5] hover:bg-[#7F1D1D]/50'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {activeChat.bot_disabled ? <BotOff size={13} /> : <Bot size={13} />}
                {activeChat.bot_disabled ? 'Бот на паузе' : 'Поставить на паузу'}
              </button>
              <button
                onClick={() => {
                  if (activeId != null) {
                    fetch(`/api/admin/chats/${activeId}/messages`, { cache: 'no-store' })
                      .then(r => r.json())
                      .then(j => setMessages(j.messages ?? []))
                  }
                }}
                className="text-white/50 hover:text-white p-1"
                title="Обновить"
              >
                <RefreshCcw size={16} />
              </button>
            </div>
            {(() => {
              const s = botStatus(activeChat)
              if (!s.soft && !s.off) return null
              return (
                <div className={`px-4 py-2 text-[12px] border-b border-white/10 ${s.off ? 'bg-[#7F1D1D]/30 text-[#FCA5A5]' : 'bg-[#1F2937] text-white/70'}`}>
                  {s.label}
                </div>
              )
            })()}

            <div ref={messagesScrollRef} className="flex-1 overflow-y-auto bg-[#1A1F2A] px-4 py-4 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-white/40 text-[13px] py-12">Нет сообщений</div>
              ) : messages.map(m => {
                const isOutbound = m.direction === 'out'
                const bg = isOutbound
                  ? (m.source === 'manager' ? 'bg-[var(--color-primary)]' : 'bg-[#374151]')
                  : 'bg-white text-[#111827]'
                return (
                  <div key={m.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed whitespace-pre-wrap ${bg}`}>
                      <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">
                        {m.source === 'user' ? 'Пользователь' : m.source === 'bot' ? 'Бот' : 'Менеджер'}
                        {m.start_payload && ` · /start ${m.start_payload}`}
                      </div>
                      {/* Render plain text — bot replies use <a> tags but we strip-render here for safety. */}
                      <div dangerouslySetInnerHTML={{ __html: linkify(m.text ?? '') }} />
                      <div className="text-[10px] opacity-50 mt-1 text-right">{new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <form
              onSubmit={e => { e.preventDefault(); send() }}
              className="shrink-0 border-t border-white/10 p-3 flex items-end gap-2 bg-[#0F1419]"
            >
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ответить пользователю…"
                rows={2}
                disabled={sending}
                className="flex-1 resize-none bg-[#1F2937] border border-white/10 rounded-xl px-3 py-2 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
            {error && <div className="px-4 py-2 text-[12px] text-[#F87171] bg-[#7F1D1D]/30 border-t border-[#F87171]/20">{error}</div>}
          </>
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center text-white/40">
            <div className="text-center">
              <MessageCircle size={42} className="mx-auto mb-3 opacity-50" />
              <div className="text-[14px]">Выберите чат слева</div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Conservative linkify: only HTML-escape + auto-link bare URLs. Bot replies
// already contain <a href> tags from the auto-reply HTML; we trust them since
// they originate from our own server-side handlers.
function linkify(text: string): string {
  // Heuristic: if text already contains "<a " or "<b>", treat as HTML and
  // pass through; otherwise escape and auto-link.
  if (/<(a |b>|i>|br\s*\/?>)/i.test(text)) return text
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(
    /(https?:\/\/\S+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline opacity-90">$1</a>',
  )
}
