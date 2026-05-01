'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Loader2, AlertTriangle } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

const GREETING: Message = {
  role: 'assistant',
  content:
    'Привет! Я Бали Гид — AI-консультант сайта balinsky.info. Могу подобрать виллу, апартамент или жилой комплекс под запрос, объяснить юридические нюансы покупки на Бали и принять обратную связь.\n\nЯ модель GPT — могу ошибаться, особенно в свежих ценах и юридике. По важным сделкам всё равно подключайте лицензированного агента и нотариуса PPAT.\n\nЧем помочь?',
}

export function ConsultantWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Body scroll lock on mobile when open (simple — only when sheet covers screen).
  useEffect(() => {
    if (!open) return
    const isMobile = window.matchMedia('(max-width: 639px)').matches
    if (!isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Esc to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Don't ship the canned greeting back to the model — it's UI-only.
          messages: next.filter((m, i) => !(i === 0 && m === GREETING)),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `http_${res.status}`)
      }
      const j = await res.json() as { message: Message }
      setMessages([...next, j.message])
    } catch (e) {
      console.error('[consultant] error:', e)
      setError('Не получилось отправить сообщение. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть AI-консультант"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white shadow-lg transition-colors"
        >
          <img
            src="/consultant-avatar.jpg"
            alt=""
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white/40"
          />
          <span className="text-[14px] font-medium hidden sm:inline">Бали Гид</span>
          <MessageCircle size={16} className="sm:hidden" />
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[400px] sm:h-[640px] sm:max-h-[calc(100vh-40px)] z-50 flex flex-col bg-white sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:border sm:border-[var(--color-border)] overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-primary-soft)]">
              <div className="flex items-center gap-2.5">
                <img
                  src="/consultant-avatar.jpg"
                  alt=""
                  className="shrink-0 w-9 h-9 rounded-full object-cover"
                />
                <div>
                  <div className="text-[14px] font-semibold text-[#111827] leading-tight">Бали Гид</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] leading-tight">AI-консультант · может ошибаться</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/60 hover:bg-white text-[#111827]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 bg-[var(--color-search-bg)] flex flex-col gap-3">
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role}>{m.content}</Bubble>
              ))}
              {loading && (
                <Bubble role="assistant">
                  <span className="inline-flex items-center gap-2 text-[var(--color-text-muted)]">
                    <Loader2 size={14} className="animate-spin" /> печатает…
                  </span>
                </Bubble>
              )}
              {error && (
                <div className="self-center text-[12px] text-[#B91C1C] inline-flex items-center gap-1.5">
                  <AlertTriangle size={13} /> {error}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); send() }}
              className="shrink-0 flex items-end gap-2 p-3 border-t border-[var(--color-border)] bg-white"
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Например: ищу виллу в Чангу до $400k, 3 спальни"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none max-h-32 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-[14px] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Отправить"
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-[var(--color-primary)] text-white rounded-br-md'
          : 'bg-white border border-[var(--color-border)] text-[#111827] rounded-bl-md'
      }`}>
        {children}
      </div>
    </div>
  )
}
