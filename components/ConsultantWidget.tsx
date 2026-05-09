'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { MessageCircle, X, Send, Loader2, AlertTriangle, BedDouble, MapPin, ExternalLink, Mic, MicOff, UserRound, Trash2 } from 'lucide-react'
import { useWishlist } from './WishlistContext'
import { RECENT_KEY, type RecentlyViewedEntry } from './PageViewTracker'
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

type Message = {
  role: 'user' | 'assistant';
  content: string;
  listings?: ListingCard[];
  // 'manager' marks a reply pushed in by an admin from /admin/chats
  // (polled via /api/chat/inbound). Rendered with a small badge so the
  // visitor can tell a human jumped in.
  source?: 'bot' | 'manager';
}

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
      'Я Балина — AI-брокер по недвижимости на Бали. Помогу подобрать объект под ваш бюджет и цели. Что вы ищете?\n\n' +
      '[CHIPS] Подобрать виллу | Подобрать апартаменты | Помесячная аренда | Юридика покупки | Связаться с менеджером',
  },
  en: {
    role: 'assistant',
    content:
      "I'm Balina — AI broker for Bali real estate. I'll help match a property to your budget and goals. What are you looking for?\n\n" +
      '[CHIPS] Pick a villa | Pick an apartment | Monthly rental | Legal side of buying | Contact a manager',
  },
}

// All UI copy in one place. The chat replies themselves come from the
// model and pick up language from the conversation context (the API
// also injects an explicit lang directive when lang === 'en').
const COPY = {
  ru: {
    triggerAria: 'Открыть AI-брокера Балину',
    triggerName: 'Балина',
    title: 'Балина',
    subtitle: 'AI-брокер · может ошибаться',
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
    triggerAria: 'Open AI broker Balina',
    triggerName: 'Balina',
    title: 'Balina',
    subtitle: 'AI broker · may be wrong',
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
  const { items: wishlistItems } = useWishlist()

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
  // Tracks whether the localStorage hydrate ran so the persistence
  // useEffect below doesn't immediately overwrite stored history with
  // the default greeting on the very first render.
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  // Hydrate conversation history from localStorage on first mount.
  // Without this every page navigation / refresh wipes the chat back
  // to the bare greeting — frustrating after the visitor has already
  // gone several turns deep with Балина. The key is per-language so
  // an /en visitor doesn't see RU history bleed in (or vice versa).
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(`balina.history.${lang}`)
      if (raw) {
        const parsed = JSON.parse(raw) as Message[]
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
    } catch { /* malformed JSON or storage disabled — fall through to greeting */ }
    hydratedRef.current = true
    // We hydrate exactly once on mount; lang changes are handled by
    // the swap-greeting effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist messages on every change. Capped at 80 entries so the
  // store doesn't grow unbounded after long sessions; the cap drops
  // the oldest, keeping the most recent context which matters more
  // for the model on next /api/chat call anyway.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hydratedRef.current) return
    try {
      const trimmed = messages.length > 80 ? messages.slice(-80) : messages
      localStorage.setItem(`balina.history.${lang}`, JSON.stringify(trimmed))
    } catch { /* quota / private mode — silently skip */ }
  }, [messages, lang])

  const clearHistory = () => {
    setMessages([greeting])
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(`balina.history.${lang}`) } catch {}
    }
  }

  // Bridge from BalinaHero on the home page. The hero dispatches a
  // `balina:open` CustomEvent with one of two payloads:
  //   { text: string, autoSend?: boolean } — prefill the input, optionally
  //                                          send it straight away
  //   { listen: true }                     — open + start voice recognition
  // Either way, the widget opens.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<{ text?: string; autoSend?: boolean; listen?: boolean }>).detail ?? {}
      setOpen(true)
      setError(null)
      if (typeof detail.text === 'string' && detail.text.trim()) {
        const text = detail.text.trim()
        if (detail.autoSend) {
          // Defer to next tick so the panel paints before we kick off the
          // network round-trip — feels much smoother than insta-loading.
          setTimeout(() => sendText(text), 50)
        } else {
          setInput(text)
        }
      }
      if (detail.listen) {
        // Same deferral — the recogniser sometimes throws if start() runs
        // before the panel has finished its open animation.
        setTimeout(() => {
          if (!listening) toggleVoice()
        }, 80)
      }
    }
    window.addEventListener('balina:open', onOpen)
    return () => window.removeEventListener('balina:open', onOpen)
    // sendText / toggleVoice are stable closures over local state we want
    // to capture lazily — eslint-disable for the dep array is fine here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll /api/chat/inbound while the widget is open so manager replies
  // typed into /admin/chats land in this conversation in (near) real
  // time. We hold a `since` cursor — server returns only messages with
  // created_at > since. On open: cursor = now, so old logged messages
  // don't get re-played.
  const inboundCursor = useRef<string | null>(null)
  useEffect(() => {
    if (!open) return
    if (typeof window === 'undefined') return
    let cancelled = false
    const tick = async () => {
      try {
        const since = inboundCursor.current
        const url = since ? `/api/chat/inbound?since=${encodeURIComponent(since)}` : '/api/chat/inbound'
        const r = await fetch(url, { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json() as {
          serverNow?: string
          messages?: { role: 'assistant'; content: string; source: 'manager'; createdAt: string }[]
        }
        if (cancelled) return
        // Initialise cursor on the first poll so we don't replay history.
        if (!inboundCursor.current && j.serverNow) inboundCursor.current = j.serverNow
        const incoming = (j.messages ?? []).filter(m => m.content.trim())
        if (incoming.length > 0) {
          setMessages(prev => [...prev, ...incoming.map(m => ({
            role: 'assistant' as const,
            content: m.content,
            source: 'manager' as const,
          }))])
          // Bump cursor to the newest manager message we received.
          const latest = incoming[incoming.length - 1].createdAt
          if (latest > (inboundCursor.current ?? '')) inboundCursor.current = latest
        }
      } catch {
        // Network blips are fine — we'll catch up on the next tick.
      }
    }
    // First tick on open establishes the cursor; then 5-sec interval.
    void tick()
    const id = setInterval(tick, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [open])

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
      // Pull the visitor's catalog footprint — what they've hearted
      // and recently opened — so the model can reason about it as
      // existing context instead of asking from scratch every time.
      // Both come from localStorage; if quota / private mode they
      // simply degrade to empty.
      let recentlyViewed: RecentlyViewedEntry[] = []
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(RECENT_KEY) : null
        if (raw) recentlyViewed = (JSON.parse(raw) as RecentlyViewedEntry[]).slice(0, 10)
      } catch { /* ignore */ }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Drop the greeting before sending — model never needs to
          // see it. Pass current site language so the API can append
          // a "respond in English" directive when the visitor's on /en.
          messages: next.filter((m, i) => !(i === 0 && (m === GREETING_BY_LANG.ru || m === GREETING_BY_LANG.en))),
          lang,
          // Visitor's catalog footprint — wishlist + recently opened
          // detail pages. The model uses this to skip "what are you
          // looking for?" when it's already implied, and to comment
          // on the comparison ("из тех, что ты лайкнул, Origins
          // дороже Allex на 40% — рассказать почему?").
          userContext: {
            wishlist: wishlistItems.map(it => ({
              kind: it.kind,
              slug: it.slug,
              title: it.title,
              district: it.district,
              priceUsd: it.priceUsd,
              bedrooms: it.bedrooms,
              area: it.area ?? null,
            })),
            recentlyViewed: recentlyViewed.map(e => ({
              kind: e.kind, slug: e.slug, title: e.title, at: e.at,
            })),
          },
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
            src="/balina.jpg"
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
                  src="/balina.jpg"
                  alt=""
                  className="shrink-0 w-9 h-9 rounded-full object-cover"
                />
                <div>
                  <div className="text-[14px] font-semibold text-[#111827] leading-tight">{c.title}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] leading-tight">{c.subtitle}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Clear-history is a manual escape hatch when the
                    visitor wants to start over. Hidden when the chat
                    is just the greeting (nothing to clear yet). */}
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(lang === 'en' ? 'Clear the chat history?' : 'Очистить переписку?')) clearHistory()
                    }}
                    aria-label={lang === 'en' ? 'Clear chat' : 'Очистить чат'}
                    title={lang === 'en' ? 'Clear chat' : 'Очистить чат'}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/60 hover:bg-white text-[#111827]"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={c.closeAria}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/60 hover:bg-white text-[#111827]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 bg-[var(--color-search-bg)] flex flex-col gap-3">
              {messages.map((m, i) => {
                const isLastAssistant = m.role === 'assistant' && i === messages.length - 1
                const { text, chips } = m.role === 'assistant' ? extractChips(m.content) : { text: m.content, chips: [] }
                return (
                  <div key={i} className="flex flex-col gap-2">
                    {/* Manager badge: assistant message but the source
                        is a human admin who jumped into the chat from
                        /admin/chats. Sits above the bubble so the
                        visitor reads "Менеджер" before the body. */}
                    {m.source === 'manager' && (
                      <span className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] text-[10px] font-medium uppercase tracking-wide">
                        <UserRound size={10} strokeWidth={2.4} />
                        {lang === 'en' ? 'Manager' : 'Менеджер'}
                      </span>
                    )}
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
                  <TypingDots />
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

// Telegram-style "печатает…" — three dots that blink in sequence.
// Keyframes live in app/globals.css (`balina-typing`); each dot
// gets a -160ms / -80ms / 0ms delay so the wave reads left-to-right
// like the chat indicator the user is used to.
function TypingDots() {
  const dot = 'w-[6px] h-[6px] rounded-full bg-[var(--color-text-muted)] [animation:balina-typing_1.2s_ease-in-out_infinite]'
  return (
    <span className="inline-flex items-center gap-1 py-1.5" aria-label="печатает">
      <span className={dot} style={{ animationDelay: '-0.32s' }} />
      <span className={dot} style={{ animationDelay: '-0.16s' }} />
      <span className={dot} />
    </span>
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
