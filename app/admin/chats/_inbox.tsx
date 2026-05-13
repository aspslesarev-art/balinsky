'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, RefreshCcw, MessageCircle, Bot, BotOff, Tag, Mic, Square, Paperclip, X } from 'lucide-react'
import { useAdminTheme, themeClass } from '../_theme'
import { AdminAccountMenu } from '../_account-menu'

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
  tags: string[] | null
  avatar_url: string | null
  chat_type: 'private' | 'group' | 'supergroup' | 'channel' | 'assistant'
  title: string | null
}

type Tab = 'private' | 'groups' | 'assistant'

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-medium ${
        active
          ? 'bg-[var(--ax-panel)] text-[var(--ax-fg)]'
          : 'text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]'
      }`}
    >
      {label} <span className="opacity-60">· {count}</span>
    </button>
  )
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
  media_type: string | null
  media_url: string | null
  media_filename: string | null
  media_mime: string | null
  media_duration: number | null
  media_size: number | null
  sender_id: number | null
  sender_name: string | null
}

const CHATS_POLL_MS = 8000
const MESSAGES_POLL_MS = 4000

function displayName(c: ChatRow): string {
  if (c.chat_type !== 'private' && c.title) return c.title
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

// Telegram avatar with initials fallback. We don't render <img> at all
// when avatar_url is missing — keeps the DOM small for the 90% of chats
// that haven't synced an avatar yet.
function Avatar({ chat, size }: { chat: ChatRow; size: number }) {
  const name = displayName(chat)
  const cls = `shrink-0 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold overflow-hidden`
  const px = { width: size, height: size, fontSize: size <= 36 ? 13 : 14 }
  if (chat.avatar_url) {
    return (
      <div className={cls} style={px}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={chat.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    )
  }
  return <div className={cls} style={px}>{initials(name)}</div>
}
// Bot replies are stored as HTML; strip tags for the chat-list preview.
function stripHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
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
  const { theme, ready: themeReady } = useAdminTheme()
  const [chats, setChats] = useState<ChatRow[]>([])
  const [tab, setTab] = useState<Tab>('private')
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

  // Multipart upload for voice + arbitrary attachments. Shares the error
  // / sending plumbing with text send so the row above doesn't have to
  // know which kind we're sending.
  const sendMultipart = async (form: FormData) => {
    if (activeId == null) return
    setSending(true); setError(null)
    try {
      const r = await fetch(`/api/admin/chats/${activeId}/send`, { method: 'POST', body: form })
      const j = await r.json().catch(() => null) as { ok?: boolean; detail?: string } | null
      if (!j?.ok) {
        setError(j?.detail ? `Не доставлено: ${j.detail}` : 'Telegram не принял сообщение')
      }
    } catch {
      setError('Сеть недоступна')
    } finally {
      setSending(false)
    }
  }

  // --- Attachment picker ---------------------------------------------------
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file later
    if (!f) return
    const form = new FormData()
    form.set('kind', 'document')
    form.set('file', f, f.name)
    if (draft.trim()) form.set('text', draft.trim())
    setDraft('')
    await sendMultipart(form)
  }

  // --- Voice recorder ------------------------------------------------------
  const recRef = useRef<MediaRecorder | null>(null)
  const recChunks = useRef<Blob[]>([])
  const recStartedAt = useRef<number>(0)
  const [recording, setRecording] = useState(false)
  const [recElapsed, setRecElapsed] = useState(0)
  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setRecElapsed(Math.floor((Date.now() - recStartedAt.current) / 1000)), 250)
    return () => clearInterval(t)
  }, [recording])

  const startRecording = async () => {
    if (recording || activeId == null) return
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : ''
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      recChunks.current = []
      rec.ondataavailable = ev => { if (ev.data.size) recChunks.current.push(ev.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(recChunks.current, { type: rec.mimeType || 'audio/webm' })
        const seconds = Math.max(1, Math.round((Date.now() - recStartedAt.current) / 1000))
        const ext = (rec.mimeType || '').includes('ogg') ? 'ogg' : 'webm'
        const form = new FormData()
        form.set('kind', 'voice')
        form.set('duration', String(seconds))
        form.set('file', blob, `voice.${ext}`)
        await sendMultipart(form)
      }
      rec.start()
      recRef.current = rec
      recStartedAt.current = Date.now()
      setRecElapsed(0)
      setRecording(true)
    } catch (err) {
      setError('Нет доступа к микрофону')
      console.error(err)
    }
  }
  const stopRecording = (sendIt: boolean) => {
    const rec = recRef.current
    setRecording(false)
    if (!rec) return
    if (!sendIt) {
      // Drop the chunks before stopping so onstop doesn't upload them.
      recChunks.current = []
    }
    if (rec.state !== 'inactive') rec.stop()
    recRef.current = null
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

  // Render eagerly; theme defaults to dark and switches once localStorage
  // is read. A brief flash is fine; an empty page on a stale render is not.
  return (
    <div className={`h-screen flex bg-[var(--ax-bg)] text-[var(--ax-fg)] ${themeClass(theme)}`}>
      {!themeReady && null}
      {/* Left: chat list. Three tabs split DMs / groups / on-site
          AI-assistant chats. Telegram bot auto-replies live in DMs;
          groups are read-only logs; assistant tab shows visitor
          conversations with Балина from balinsky.info itself. */}
      <aside className={`flex flex-col w-full sm:w-[340px] border-r border-[var(--ax-border)] ${activeId != null ? 'hidden sm:flex' : 'flex'}`}>
        <div className="shrink-0 px-2 pt-2 border-b border-[var(--ax-border)]">
          <div className="px-2 pt-1 pb-2 flex items-center gap-1 overflow-x-auto">
            {(() => {
              const counts = chats.reduce<{ private: number; groups: number; assistant: number }>((acc, c) => {
                if (c.chat_type === 'assistant') acc.assistant++
                else if (c.chat_type === 'private') acc.private++
                else acc.groups++
                return acc
              }, { private: 0, groups: 0, assistant: 0 })
              return <>
                <TabButton active={tab === 'private'}   label="Личные"    count={counts.private}
                  onClick={() => { setTab('private');   setActiveId(null) }} />
                <TabButton active={tab === 'groups'}    label="Группы"    count={counts.groups}
                  onClick={() => { setTab('groups');    setActiveId(null) }} />
                <TabButton active={tab === 'assistant'} label="Ассистент" count={counts.assistant}
                  onClick={() => { setTab('assistant'); setActiveId(null) }} />
              </>
            })()}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {(() => {
            const filtered = chats.filter(c => {
              if (tab === 'assistant') return c.chat_type === 'assistant'
              if (tab === 'groups')    return c.chat_type !== 'private' && c.chat_type !== 'assistant'
              return c.chat_type === 'private'
            })
            if (filtered.length === 0) {
              const msg =
                tab === 'assistant' ? 'Пока никто не писал AI-брокеру с сайта.'
              : tab === 'groups'    ? 'Бот ещё не добавлен в группы. Добавь его в чат, и здесь появятся сообщения.'
              :                       'Чатов пока нет — никто не писал боту.'
              return <div className="p-6 text-[13px] text-[var(--ax-fg-faint)] text-center">{msg}</div>
            }
            return filtered.map(c => {
            const name = displayName(c)
            const isActive = c.chat_id === activeId
            return (
              <button
                key={c.chat_id}
                onClick={() => setActiveId(c.chat_id)}
                className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-[var(--ax-border-soft)] ${isActive ? 'bg-[var(--ax-panel)]' : 'hover:bg-[var(--ax-hover)]'}`}
              >
                <Avatar chat={c} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[14px] font-medium truncate">{name}</div>
                    <div className="text-[11px] text-[var(--ax-fg-faint)] shrink-0">{relTime(c.last_message_at)}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div className="text-[12px] text-[var(--ax-fg-muted)] truncate">{stripHtml(c.last_message_text) || '—'}</div>
                    {c.unread_count > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-semibold">{c.unread_count}</span>
                    )}
                  </div>
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.tags.slice(0, 3).map(t => (
                        <span key={t} className="inline-flex items-center gap-0.5 text-[10px] text-[var(--ax-fg-soft)] bg-[var(--ax-hover)] rounded px-1.5 py-0.5">
                          <Tag size={9} /> {t}
                        </span>
                      ))}
                      {c.tags.length > 3 && (
                        <span className="text-[10px] text-[var(--ax-fg-faint)]">+{c.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })
          })()}
        </div>
        <AdminAccountMenu />
      </aside>

      {/* Right: conversation */}
      <main className={`flex-1 flex flex-col min-w-0 ${activeId == null ? 'hidden sm:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="shrink-0 px-4 py-3 border-b border-[var(--ax-border)] flex items-center gap-3">
              <button onClick={() => setActiveId(null)} className="sm:hidden text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)]">←</button>
              <Avatar chat={activeChat} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">{displayName(activeChat)}</div>
                <div className="text-[11px] text-[var(--ax-fg-muted)] truncate">
                  {activeChat.chat_type !== 'private' ? `${activeChat.chat_type} · ` : ''}
                  chat_id {activeChat.chat_id}{activeChat.username ? ` · @${activeChat.username}` : ''}
                </div>
              </div>
              {/* Bot pause toggle is meaningless in groups (the bot never
                  auto-replies there), so we hide it for non-private chats. */}
              {activeChat.chat_type === 'private' && (
                <button
                  onClick={toggleBot}
                  title={activeChat.bot_disabled ? 'Включить автоответ бота' : 'Поставить бота на паузу'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium ${
                    activeChat.bot_disabled
                      ? 'bg-[var(--ax-paused-bg)] text-[var(--ax-paused-fg)] hover:opacity-90'
                      : 'bg-[var(--ax-hover)] text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)]'
                  }`}
                >
                  {activeChat.bot_disabled ? <BotOff size={13} /> : <Bot size={13} />}
                  {activeChat.bot_disabled ? 'Бот на паузе' : 'Поставить на паузу'}
                </button>
              )}
              <button
                onClick={() => {
                  if (activeId != null) {
                    fetch(`/api/admin/chats/${activeId}/messages`, { cache: 'no-store' })
                      .then(r => r.json())
                      .then(j => setMessages(j.messages ?? []))
                  }
                }}
                className="text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] p-1"
                title="Обновить"
              >
                <RefreshCcw size={16} />
              </button>
            </div>
            {activeChat.chat_type === 'private' && (() => {
              const s = botStatus(activeChat)
              if (!s.soft && !s.off) return null
              return (
                <div className={`px-4 py-2 text-[12px] border-b border-[var(--ax-border)] ${s.off ? 'bg-[var(--ax-paused-bg)] text-[var(--ax-paused-fg)]' : 'bg-[var(--ax-panel)] text-[var(--ax-fg-soft)]'}`}>
                  {s.label}
                </div>
              )
            })()}
            {activeChat.chat_type !== 'private' && (
              <div className="px-4 py-2 text-[12px] border-b border-[var(--ax-border)] bg-[var(--ax-panel)] text-[var(--ax-fg-soft)]">
                Бот в группе только пишет лог, ничего не отвечает автоматически. Сообщения отсюда уходят в чат от имени бота.
              </div>
            )}

            <div ref={messagesScrollRef} className="flex-1 overflow-y-auto bg-[var(--ax-chat-bg)] px-4 py-4 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-[var(--ax-fg-faint)] text-[13px] py-12">Нет сообщений</div>
              ) : messages.map(m => {
                const isOutbound = m.direction === 'out'
                const bg = isOutbound
                  ? (m.source === 'manager' ? 'bg-[var(--color-primary)]' : 'bg-[var(--ax-bubble-bot-bg)]')
                  : 'bg-[var(--ax-bubble-user-bg)] text-[var(--ax-bubble-user-fg)]'
                return (
                  <div key={m.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed whitespace-pre-wrap ${bg}`}>
                      <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">
                        {/* In groups inbound messages have a real speaker
                            name; in DMs we just label the role. */}
                        {m.sender_name
                          ? m.sender_name
                          : m.source === 'user' ? 'Пользователь' : m.source === 'bot' ? 'Бот' : 'Менеджер'}
                        {m.start_payload && ` · /start ${m.start_payload}`}
                      </div>
                      <MessageBody m={m} />
                      <div className="text-[10px] opacity-50 mt-1 text-right">{new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Assistant chats: manager can join the conversation.
                When sent, /api/admin/chats/[chatId]/send detects
                chat_type=assistant and just logs to bot_messages
                (skipping Telegram). The visitor's ConsultantWidget
                polls /api/chat/inbound every 5s and surfaces the
                manager reply inline as if from the assistant, with
                a small "Менеджер" badge so it's clear it's a human. */}
            <form
              onSubmit={e => { e.preventDefault(); send() }}
              className="shrink-0 border-t border-[var(--ax-border)] p-3 flex items-end gap-2 bg-[var(--ax-bg)]"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={onFilePicked}
                className="hidden"
                disabled={sending || recording}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || recording}
                title="Прикрепить файл"
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-fg)] disabled:opacity-40"
              >
                <Paperclip size={18} />
              </button>

              {recording ? (
                <div className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--ax-input-bg)] border border-[var(--color-primary)]">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[13px] tabular-nums text-[var(--ax-fg)]">
                    {Math.floor(recElapsed / 60)}:{String(recElapsed % 60).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[12px] text-[var(--ax-fg-muted)]">Запись… нажмите ⏹ чтобы отправить</span>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    title="Отменить"
                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-fg)]"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={activeChat.chat_type === 'private' ? 'Ответить пользователю…' : 'Сообщение в группу…'}
                  rows={2}
                  disabled={sending}
                  className="flex-1 resize-none bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] rounded-xl px-3 py-2 text-[14px] text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              )}

              {recording ? (
                <button
                  type="button"
                  onClick={() => stopRecording(true)}
                  title="Остановить и отправить"
                  className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white"
                >
                  <Square size={18} fill="currentColor" />
                </button>
              ) : draft.trim() ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={sending}
                  title="Записать голосовое"
                  className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white disabled:opacity-50"
                >
                  <Mic size={18} />
                </button>
              )}
            </form>
            {error && <div className="px-4 py-2 text-[12px] text-[var(--ax-error-fg)] bg-[var(--ax-error-bg)] border-t border-[var(--ax-error-border)]">{error}</div>}
          </>
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center text-[var(--ax-fg-faint)]">
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

// Renders the body of a chat message: media (voice / photo / file)
// stacked above any caption text. Photos render inline; voice shows a
// native <audio> player; documents become a clickable filename row.
function MessageBody({ m }: { m: MessageRow }) {
  const hasText = !!(m.text && m.text.trim())
  return (
    <div className="space-y-1.5">
      {m.media_type && m.media_url && (
        <MediaBlock m={m} />
      )}
      {hasText && (
        <div dangerouslySetInnerHTML={{ __html: linkify(m.text ?? '') }} />
      )}
      {!m.media_type && !hasText && (
        <span className="opacity-60 italic text-[13px]">[пусто]</span>
      )}
    </div>
  )
}

function MediaBlock({ m }: { m: MessageRow }) {
  const url = m.media_url!
  switch (m.media_type) {
    case 'voice':
    case 'audio':
      return (
        <audio
          controls
          src={url}
          preload="metadata"
          className="w-full max-w-[280px] [color-scheme:auto]"
        />
      )
    case 'photo':
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={m.media_filename ?? 'photo'} className="rounded-lg max-h-[260px] w-auto" />
        </a>
      )
    case 'video':
    case 'video_note':
      return (
        <video controls src={url} className="rounded-lg max-h-[260px] w-auto max-w-full" />
      )
    case 'sticker':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="sticker" className="max-h-[140px] w-auto" />
      )
    case 'document':
    default:
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black/10 hover:bg-black/15 text-[13px] no-underline"
        >
          <Paperclip size={14} className="opacity-70" />
          <span className="truncate max-w-[220px]">{m.media_filename ?? 'файл'}</span>
          {m.media_size != null && (
            <span className="opacity-60 text-[11px]">{formatBytes(m.media_size)}</span>
          )}
        </a>
      )
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
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
