'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { MessageCircle, X, Send, Loader2, AlertTriangle, BedDouble, MapPin, ExternalLink, Mic, MicOff } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// Minimal Web Speech API typing — TS stdlib doesn't ship it, and we only use
// the few fields we touch.
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

type ListingCard = {
  kind: 'villa' | 'apartment' | 'complex' | 'developer' | 'rental'
  title: string
  url: string
  photo: string | null
  district: string | null
  bedrooms: number | null
  area_sqm: number | null
  price_usd: number | null
  price_per_sqm_usd: number | null
  rent_per_month_usd: number | null
}

type Message = { role: 'user' | 'assistant'; content: string; listings?: ListingCard[] }

// Strips a trailing `[CHIPS] a | b | c` block off an assistant message and
// returns it as a list of suggestion strings. Chips show only for the LAST
// assistant message — old chips would offer answers that no longer make
// sense for the current state of the conversation.
function extractChips(content: string): { text: string; chips: string[] } {
  const m = content.match(/\n*\[CHIPS\]\s*(.+?)\s*$/)
  if (!m) return { text: content, chips: [] }
  const chips = m[1].split('|').map(s => s.trim()).filter(Boolean).slice(0, 6)
  return { text: content.slice(0, m.index).trimEnd(), chips }
}

// First message in every conversation. Includes its own [CHIPS] block,
// so the entry-point picks render through the same chip pipeline as
// every later step — chips lead to chips end-to-end.
const GREETING_BY_LANG: Record<Lang, Message> = {
  ru: {
    role: 'assistant',
    content:
      'Я Бали Гид — AI-помощник по недвижимости на Бали. Могу ошибаться. Что нужно?\n\n' +
      '[CHIPS] Подобрать виллу | Подобрать апартаменты | Помесячная аренда | Юридика покупки | Связаться с менеджером',
  },
  en: {
    role: 'assistant',
    content:
      "I'm the Bali Guide — AI helper for Bali real estate. I might be wrong. What do you need?\n\n" +
      '[CHIPS] Pick a villa | Pick an apartment | Monthly rental | Legal side of buying | Contact a manager',
  },
}

// All UI copy in one place. The chat replies themselves come from the
// model and pick up language from the conversation context (the API
// also injects an explicit lang directive when lang === 'en').
const COPY = {
  ru: {
    triggerAria: 'Открыть AI-консультант',
    triggerName: 'Бали Гид',
    title: 'Бали Гид',
    subtitle: 'AI-консультант · может ошибаться',
    closeAria: 'Закрыть',
    typing: 'печатает…',
    placeholder: 'Что ищешь? Например, виллу в Чангу с 3 спальнями',
    listening: 'Слушаю…',
    sendError: 'Не получилось отправить сообщение. Попробуйте ещё раз.',
    micDenied: 'Доступ к микрофону запрещён.',
    micError: (e: string) => `Ошибка распознавания: ${e}`,
    voiceStartAria: 'Записать голосом',
    voiceStopAria: 'Остановить запись',
    voiceStartTitle: 'Записать голосом',
    voiceStopTitle: 'Остановить',
    sendAria: 'Отправить',
    perMonth: ' / мес',
    perSqm: '/ м²',
    voiceLang: 'ru-RU',
  },
  en: {
    triggerAria: 'Open AI consultant',
    triggerName: 'Bali Guide',
    title: 'Bali Guide',
    subtitle: 'AI consultant · may be wrong',
    closeAria: 'Close',
    typing: 'typing…',
    placeholder: 'What are you looking for? e.g. a villa in Canggu with 3 bedrooms',
    listening: 'Listening…',
    sendError: 'Could not send the message. Please try again.',
    micDenied: 'Microphone access denied.',
    micError: (e: string) => `Recognition error: ${e}`,
    voiceStartAria: 'Record by voice',
    voiceStopAria: 'Stop recording',
    voiceStartTitle: 'Record by voice',
    voiceStopTitle: 'Stop',
    sendAria: 'Send',
    perMonth: ' / mo',
    perSqm: '/ m²',
    voiceLang: 'en-US',
  },
} as const

export function ConsultantWidget() {
  // Lang follows the URL: /en/* → English, anything else → Russian.
  // Greeting + UI copy + voice recognition locale + the lang directive
  // we send to the chat API all key off this.
  const pathname = usePathname() ?? ''
  const lang: Lang = pathname.startsWith('/en') ? 'en' : 'ru'
  const c = COPY[lang]
  const greeting = GREETING_BY_LANG[lang]

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([greeting])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  // Snapshot of input text at the moment listening started — speech results
  // append to this so existing typing isn't blown away.
  const baseInputRef = useRef('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  // Swap the greeting if the visitor navigated between /ru and /en
  // before saying anything — keeps the entry chips in the same
  // language as the rest of the page. Don't touch in-progress chats.
  useEffect(() => {
    setMessages(prev => {
      if (prev.length !== 1) return prev
      const wasGreeting = prev[0] === GREETING_BY_LANG.ru || prev[0] === GREETING_BY_LANG.en
      return wasGreeting ? [greeting] : prev
    })
  }, [greeting])

  const toggleVoice = () => {
    if (typeof window === 'undefined') return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = c.voiceLang
    rec.continuous = false
    rec.interimResults = true
    baseInputRef.current = input.trim()
    rec.onresult = (e) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript
      }
      const sep = baseInputRef.current && transcript ? ' ' : ''
      setInput(baseInputRef.current + sep + transcript)
    }
    rec.onend = () => {
      setListening(false)
      recRef.current = null
    }
    rec.onerror = (e) => {
      setListening(false)
      recRef.current = null
      if (e?.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        setError(e.error === 'not-allowed' ? c.micDenied : c.micError(e.error))
      }
    }
    try {
      rec.start()
      recRef.current = rec
      setListening(true)
      setError(null)
    } catch {
      // Some browsers throw if start() is called too quickly in succession.
      setListening(false)
    }
  }

  // Stop recognition when widget closes.
  useEffect(() => {
    if (!open && recRef.current) {
      recRef.current.abort()
      recRef.current = null
      setListening(false)
    }
  }, [open])

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

  const sendText = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const next: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Drop the greeting before sending — model never needs to
          // see it. Pass current site language so the API can append
          // a "respond in English" directive when the visitor's on /en.
          messages: next.filter((m, i) => !(i === 0 && (m === GREETING_BY_LANG.ru || m === GREETING_BY_LANG.en))),
          lang,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `http_${res.status}`)
      }
      const j = await res.json() as { message: Message; listings?: ListingCard[] }
      setMessages([...next, { ...j.message, listings: j.listings }])
    } catch (e) {
      console.error('[consultant] error:', e)
      setError(c.sendError)
    } finally {
      setLoading(false)
    }
  }
  const send = () => sendText(input)

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={c.triggerAria}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white shadow-lg transition-colors"
        >
          <img
            src="/consultant-avatar.jpg"
            alt=""
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white/40"
          />
          <span className="text-[14px] font-medium hidden sm:inline">{c.triggerName}</span>
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
                  <div className="text-[14px] font-semibold text-[#111827] leading-tight">{c.title}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] leading-tight">{c.subtitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={c.closeAria}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/60 hover:bg-white text-[#111827]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 bg-[var(--color-search-bg)] flex flex-col gap-3">
              {messages.map((m, i) => {
                const isLastAssistant = m.role === 'assistant' && i === messages.length - 1
                const { text, chips } = m.role === 'assistant' ? extractChips(m.content) : { text: m.content, chips: [] }
                return (
                  <div key={i} className="flex flex-col gap-2">
                    {text && <Bubble role={m.role}>{text}</Bubble>}
                    {m.listings && m.listings.length > 0 && (
                      <div className="self-start max-w-[95%] flex flex-col gap-2">
                        {m.listings.map(card => <ListingChatCard key={card.url} card={card} lang={lang} />)}
                      </div>
                    )}
                    {isLastAssistant && chips.length > 0 && !loading && (
                      <div className="self-start flex flex-wrap gap-1.5 mt-0.5 max-w-[95%]">
                        {chips.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => sendText(c)}
                            className="text-[12px] px-3 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-[#111827] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {/* Greeting chips render via the same extractChips path as
                  later replies — see the [CHIPS] block in GREETING. */}
              {loading && (
                <Bubble role="assistant">
                  <span className="inline-flex items-center gap-2 text-[var(--color-text-muted)]">
                    <Loader2 size={14} className="animate-spin" /> {c.typing}
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
                placeholder={listening ? c.listening : c.placeholder}
                rows={2}
                disabled={loading}
                className="flex-1 resize-none min-h-[48px] max-h-32 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-[14px] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
              />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={loading}
                  aria-label={listening ? c.voiceStopAria : c.voiceStartAria}
                  title={listening ? c.voiceStopTitle : c.voiceStartTitle}
                  className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors disabled:opacity-50 ${
                    listening
                      ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white animate-pulse'
                      : 'bg-black/5 hover:bg-black/10 text-[#111827]'
                  }`}
                >
                  {listening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label={c.sendAria}
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

function fmtUsd(n: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null
  return '$' + Math.round(n).toLocaleString('en-US')
}

function ListingChatCard({ card, lang }: { card: ListingCard; lang: Lang }) {
  const isRental = card.kind === 'rental'
  const mainPrice = isRental ? fmtUsd(card.rent_per_month_usd) : fmtUsd(card.price_usd)
  const priceSuffix = isRental ? COPY[lang].perMonth : ''
  return (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-stretch gap-3 rounded-2xl border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] transition-colors no-underline overflow-hidden group"
    >
      <div className="shrink-0 w-[88px] h-[88px] bg-[var(--color-search-bg)]">
        {card.photo ? (
          <img src={card.photo} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🏡</div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-2 pr-3 flex flex-col justify-center">
        <div className="text-[13px] font-semibold text-[#111827] leading-tight line-clamp-2">{card.title}</div>
        <div className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-text-muted)]">
          {mainPrice && (
            <span className="font-semibold text-[#111827] text-[12px]">
              {mainPrice}{priceSuffix}
            </span>
          )}
          {card.price_per_sqm_usd != null && card.price_per_sqm_usd > 0 && (
            <span>{fmtUsd(card.price_per_sqm_usd)} {COPY[lang].perSqm}</span>
          )}
          {card.bedrooms != null && (
            <span className="inline-flex items-center gap-0.5"><BedDouble size={11} /> {card.bedrooms} BR</span>
          )}
          {card.district && (
            <span className="inline-flex items-center gap-0.5"><MapPin size={11} /> {card.district}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 self-start mt-2 mr-2 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]">
        <ExternalLink size={14} />
      </div>
    </a>
  )
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const isUser = role === 'user'
  const isString = typeof children === 'string'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
        isUser
          ? 'bg-[var(--color-primary)] text-white rounded-br-md whitespace-pre-wrap'
          : 'bg-white border border-[var(--color-border)] text-[#111827] rounded-bl-md'
      }`}>
        {!isUser && isString ? (
          <div className="prose-chat">
            <ReactMarkdown
              components={{
                // Render only inline-style elements; lists become tight, paragraphs lose default margins.
                p:  ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary-pressed)] underline">
                    {children}
                  </a>
                ),
                code: ({ children }) => <code className="px-1 py-0.5 rounded bg-black/5 text-[12px]">{children}</code>,
              }}
            >
              {children as string}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{children}</div>
        )}
      </div>
    </div>
  )
}
