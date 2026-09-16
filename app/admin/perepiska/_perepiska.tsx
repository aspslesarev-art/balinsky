'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Paperclip, X, Search, CalendarDays, MessageSquareText, FileText, Mic, Loader2 } from 'lucide-react'
import { useAdminTheme, themeClass } from '../_theme'
import { AdminAccountMenu } from '../_account-menu'

// Личная Telegram-переписка владельца (Telegram Business). Бот-наблюдатель
// пишет её в tg_messages и отмечает встречи в tg_meetings. Отсюда можно
// ответить — сообщение уходит от имени владельца.

type Chat = {
  chat_id: number
  contact: string | null
  last_ts: string
  last_text: string | null
  last_direction: 'in' | 'out'
  last_media_type: string | null
  message_count: number
  meeting_count: number
}

type Message = {
  id: number
  direction: 'in' | 'out'
  text: string | null
  voice_transcript: string | null
  is_voice: boolean
  media_type: string | null
  file_name: string | null
  has_file: boolean
  sent_by: string | null
  ts: string
}

type Meeting = {
  id: number
  status: 'agreed' | 'scheduled' | 'cancelled'
  topic: string | null
  starts_at: string | null
  place: string | null
}

const CHATS_POLL_MS = 15000
const MESSAGES_POLL_MS = 5000
const MAX_FILE_BYTES = 50 * 1024 * 1024 // лимит Telegram на отправку ботом

const MEDIA_LABEL: Record<string, string> = {
  photo: 'Фото', document: 'Файл', video: 'Видео', voice: 'Голосовое', audio: 'Аудио',
  video_note: 'Кружок', sticker: 'Стикер', animation: 'GIF',
}

function nameOf(c: Chat): string {
  return c.contact?.replace(/\s*\(@[^)]+\)$/, '') || `Чат ${c.chat_id}`
}
function usernameOf(c: Chat): string | null {
  return c.contact?.match(/\(@([^)]+)\)$/)?.[1] ?? null
}
function initials(name: string): string {
  // Только буквы: у «Daria 💎» половинка эмодзи давала битый символ.
  const letters = name.split(/\s+/).map(w => w.match(/\p{L}/u)?.[0]).filter(Boolean)
  return letters.length ? (letters[0]! + (letters[1] ?? '')).toUpperCase() : '?'
}

function relTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'сейчас'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин`
  if (diff < 86400_000) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function meetingWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400_000)
  if (d.toDateString() === today.toDateString()) return 'Сегодня'
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} КБ`
  return `${(n / 1024 / 1024).toFixed(1)} МБ`
}

export function Perepiska() {
  const { theme } = useAdminTheme()
  const [chats, setChats] = useState<Chat[] | null>(null)
  const [chatsError, setChatsError] = useState(false)
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [draft, setDraft] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lastIdRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch('/api/admin/perepiska', { cache: 'no-store' })
        if (r.status === 401) { window.location.href = '/admin'; return }
        const j = await r.json() as { ok: boolean; chats?: Chat[] }
        if (cancelled) return
        if (j.ok) { setChats(j.chats ?? []); setChatsError(false) } else setChatsError(true)
      } catch { if (!cancelled) setChatsError(true) }
    }
    load()
    const t = setInterval(load, CHATS_POLL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const loadMessages = async (id: number, signal?: { cancelled: boolean }) => {
    try {
      const r = await fetch(`/api/admin/perepiska/${id}`, { cache: 'no-store' })
      if (r.status === 401) { window.location.href = '/admin'; return }
      const j = await r.json() as { ok: boolean; messages?: Message[]; meetings?: Meeting[] }
      if (signal?.cancelled || !j.ok) return
      const msgs = j.messages ?? []
      setMessages(msgs)
      setMeetings(j.meetings ?? [])
      const last = msgs.at(-1)
      if (last && last.id !== lastIdRef.current) {
        lastIdRef.current = last.id
        requestAnimationFrame(() => {
          const el = scrollRef.current
          if (el) el.scrollTop = el.scrollHeight
        })
      }
    } catch { /* следующий опрос повторит */ }
  }

  useEffect(() => {
    if (activeId == null) return
    const signal = { cancelled: false }
    setMessages(null)
    setMeetings([])
    setError(null)
    lastIdRef.current = null
    loadMessages(activeId, signal)
    const t = setInterval(() => loadMessages(activeId, signal), MESSAGES_POLL_MS)
    return () => { signal.cancelled = true; clearInterval(t) }
  }, [activeId])

  const filtered = useMemo(() => {
    if (!chats) return []
    const q = query.trim().toLowerCase()
    return q ? chats.filter(c => (c.contact ?? '').toLowerCase().includes(q)) : chats
  }, [chats, query])

  const activeChat = chats?.find(c => c.chat_id === activeId) ?? null
  const upcoming = meetings.filter(m => m.status !== 'cancelled' && m.starts_at && new Date(m.starts_at).getTime() > Date.now() - 3600_000)

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_FILE_BYTES) { setError(`Файл ${formatBytes(f.size)} — больше 50 МБ, Telegram такой не примет`); return }
    setError(null)
    setFile(f)
  }

  const send = async () => {
    if (activeId == null || sending) return
    const text = draft.trim()
    if (!text && !file) return
    setSending(true); setError(null)
    try {
      let filePayload: { path: string; name: string; type: string } | null = null
      if (file) {
        const u = await fetch(`/api/admin/perepiska/${activeId}/upload`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: file.name }),
        }).then(r => r.json()) as { ok: boolean; path?: string; signedUrl?: string }
        if (!u.ok || !u.signedUrl || !u.path) throw new Error('Не удалось подготовить загрузку файла')
        const put = await fetch(u.signedUrl, {
          method: 'PUT',
          headers: { 'content-type': file.type || 'application/octet-stream' },
          body: file,
        })
        if (!put.ok) throw new Error('Файл не загрузился, попробуйте ещё раз')
        filePayload = { path: u.path, name: file.name, type: file.type }
      }
      const r = await fetch(`/api/admin/perepiska/${activeId}/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, file: filePayload }),
      })
      if (r.status === 401) { window.location.href = '/admin'; return }
      const j = await r.json().catch(() => null) as { ok?: boolean; error?: string } | null
      if (!j?.ok) throw new Error(j?.error || 'Telegram не принял сообщение')
      setDraft('')
      setFile(null)
      await loadMessages(activeId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Сеть недоступна')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`h-[100dvh] flex bg-[var(--ax-bg)] text-[var(--ax-fg)] ${themeClass(theme)}`}>
      <aside className={`flex-col w-full sm:w-[340px] min-w-0 border-r border-[var(--ax-border)] ${activeId != null ? 'hidden sm:flex' : 'flex'}`}>
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[var(--ax-border)]">
          <h1 className="text-[16px] font-semibold tracking-tight">Переписка Telegram</h1>
          <p className="text-[12px] text-[var(--ax-fg-muted)] mt-1 leading-snug">
            Чаты, которые читает бот. Ответ уходит от имени Андрея.
          </p>
          <label className="mt-3 flex items-center gap-2 px-3 h-9 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] focus-within:border-[var(--color-primary)]">
            <Search size={14} className="text-[var(--ax-fg-faint)] shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Найти по имени"
              className="flex-1 min-w-0 bg-transparent text-[12px] outline-none placeholder:text-[var(--ax-fg-faint)]"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Очистить" className="text-[var(--ax-fg-faint)] hover:text-[var(--ax-fg)]">
                <X size={14} />
              </button>
            )}
          </label>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {chats == null ? (
            chatsError
              ? <div className="p-6 text-[12px] text-[var(--ax-error-fg)] text-center">Не удалось загрузить чаты. Обновите страницу.</div>
              : <ListSkeleton />
          ) : filtered.length === 0 ? (
            <div className="p-6 text-[12px] text-[var(--ax-fg-faint)] text-center">
              {query ? 'Никого не нашли' : 'Бот пока не видел ни одной переписки'}
            </div>
          ) : filtered.map(c => {
            const name = nameOf(c)
            const preview = c.last_text?.trim() || (c.last_media_type ? MEDIA_LABEL[c.last_media_type] ?? 'Вложение' : '—')
            return (
              <button
                key={c.chat_id}
                type="button"
                onClick={() => setActiveId(c.chat_id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-[var(--ax-border-soft)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:-outline-offset-2 ${c.chat_id === activeId ? 'bg-[var(--ax-panel)]' : 'hover:bg-[var(--ax-hover)]'}`}
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-[12px] font-semibold">
                  {initials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[14px] font-medium truncate">{name}</div>
                    <div className="text-[12px] text-[var(--ax-fg-faint)] shrink-0">{relTime(c.last_ts)}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div className="text-[12px] text-[var(--ax-fg-muted)] truncate">
                      {c.last_direction === 'out' && <span className="text-[var(--ax-fg-faint)]">Вы: </span>}
                      {preview}
                    </div>
                    {c.meeting_count > 0 && (
                      <span title="Есть встречи" className="shrink-0 inline-flex items-center gap-1 text-[12px] text-[var(--ax-fg-soft)]">
                        <CalendarDays size={12} /> {c.meeting_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <AdminAccountMenu />
      </aside>

      <main className={`flex-1 flex-col min-w-0 ${activeId == null ? 'hidden sm:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <header className="shrink-0 px-4 h-14 border-b border-[var(--ax-border)] flex items-center gap-3">
              <button type="button" onClick={() => setActiveId(null)} aria-label="Назад к чатам" className="sm:hidden -ml-1 px-2 py-1 rounded-md text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]">←</button>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">{nameOf(activeChat)}</div>
                <div className="text-[12px] text-[var(--ax-fg-muted)] truncate">
                  {usernameOf(activeChat) ? `@${usernameOf(activeChat)} · ` : ''}{activeChat.message_count} сообщ.
                </div>
              </div>
              {usernameOf(activeChat) && (
                <a
                  href={`https://t.me/${usernameOf(activeChat)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[12px] px-3 py-1.5 rounded-full bg-[var(--ax-hover)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] no-underline"
                >
                  Открыть в Telegram
                </a>
              )}
            </header>

            {upcoming.length > 0 && (
              <div className="shrink-0 px-4 py-2 border-b border-[var(--ax-border)] bg-[var(--ax-panel)] space-y-1">
                {upcoming.map(m => (
                  <div key={m.id} className="flex items-start gap-2 text-[12px] leading-snug min-w-0">
                    <CalendarDays size={14} className="shrink-0 mt-px text-[var(--color-primary)]" />
                    <span className="font-medium shrink-0">{meetingWhen(m.starts_at!)}</span>
                    <span className="text-[var(--ax-fg-muted)] min-w-0">
                      {[m.topic, m.place ?? 'место не выбрано'].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[var(--ax-chat-bg)] px-4 py-4">
              {messages == null ? (
                <div className="flex justify-center py-12 text-[var(--ax-fg-faint)]"><Loader2 size={20} className="animate-spin" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center text-[var(--ax-fg-faint)] text-[12px] py-12">Сообщений нет</div>
              ) : (
                <div className="max-w-[760px] mx-auto space-y-1.5">
                  {messages.map((m, i) => {
                    const newDay = i === 0 || new Date(messages[i - 1].ts).toDateString() !== new Date(m.ts).toDateString()
                    return (
                      <div key={m.id}>
                        {newDay && (
                          <div className="flex justify-center py-3">
                            <span className="text-[12px] px-2.5 py-0.5 rounded-full bg-[var(--ax-hover)] text-[var(--ax-fg-muted)]">{dayLabel(m.ts)}</span>
                          </div>
                        )}
                        <Bubble m={m} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <form
              onSubmit={e => { e.preventDefault(); send() }}
              className="shrink-0 border-t border-[var(--ax-border)] bg-[var(--ax-bg)] px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))]"
            >
              {error && (
                <div role="alert" className="mb-2 px-3 py-2 rounded-lg text-[12px] text-[var(--ax-error-fg)] bg-[var(--ax-error-bg)] border border-[var(--ax-error-border)]">
                  {error}
                </div>
              )}
              {file && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--ax-panel)] border border-[var(--ax-border)] text-[12px] min-w-0">
                  <FileText size={16} className="shrink-0 text-[var(--ax-fg-soft)]" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-[12px] text-[var(--ax-fg-faint)]">{formatBytes(file.size)}</span>
                  <button type="button" onClick={() => setFile(null)} disabled={sending} aria-label="Убрать файл" className="ml-auto shrink-0 p-1 rounded-md text-[var(--ax-fg-faint)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] disabled:opacity-40">
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" onChange={pickFile} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="Прикрепить файл"
                  aria-label="Прикрепить файл"
                  className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-fg)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={file ? 'Подпись к файлу (необязательно)' : 'Написать от имени Андрея…'}
                  rows={1}
                  disabled={sending}
                  className="flex-1 min-w-0 resize-none max-h-40 bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] rounded-xl px-3 py-2.5 text-[14px] leading-snug text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={sending || (!draft.trim() && !file)}
                  aria-label="Отправить"
                  className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--ax-fg-faint)]">
            <div className="text-center">
              <MessageSquareText size={40} className="mx-auto mb-3 opacity-50" />
              <div className="text-[14px]">Выберите чат слева</div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Bubble({ m }: { m: Message }) {
  const out = m.direction === 'out'
  const body = (m.voice_transcript ?? m.text ?? '').trim()
  const fileUrl = `/api/admin/perepiska/file?id=${m.id}`
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${out ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--ax-bubble-user-bg)] text-[var(--ax-bubble-user-fg)]'}`}>
        {m.has_file && m.media_type === 'photo' ? (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl} alt={body || 'Фото из переписки'} loading="lazy" className="rounded-lg max-h-[260px] w-auto" />
          </a>
        ) : m.has_file && (m.media_type === 'voice' || m.media_type === 'audio') ? (
          <audio controls preload="none" src={fileUrl} className="w-[240px] max-w-full mb-1" />
        ) : m.has_file ? (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-1 px-2.5 py-2 rounded-lg bg-black/10 hover:bg-black/15 text-[12px] no-underline min-w-0">
            <Paperclip size={14} className="shrink-0" />
            <span className="truncate">{m.file_name || MEDIA_LABEL[m.media_type ?? ''] || 'Файл'}</span>
          </a>
        ) : m.is_voice ? (
          <div className="flex items-center gap-1.5 text-[12px] opacity-70 mb-0.5"><Mic size={12} /> Голосовое</div>
        ) : null}
        {body && <div className="whitespace-pre-wrap break-words">{m.is_voice && m.voice_transcript ? <span className="italic">{body}</span> : <Linkified text={body} />}</div>}
        {!body && !m.has_file && !m.is_voice && <span className="text-[12px] italic opacity-60">[{MEDIA_LABEL[m.media_type ?? ''] ?? 'вложение'}]</span>}
        <div className={`text-[12px] mt-0.5 text-right ${out ? 'text-white/70' : 'opacity-50'}`}>
          {m.sent_by ? `${m.sent_by} · ` : ''}
          {new Date(m.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

// Ссылки кликабельны; текст остаётся текстом (React экранирует), HTML не вставляем.
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
        i % 2 === 1
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">{part}</a>
          : part,
      )}
    </>
  )
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка чатов">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-[var(--ax-border-soft)]">
          <div className="w-10 h-10 rounded-full bg-[var(--ax-hover)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-[var(--ax-hover)] animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-[var(--ax-hover)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
