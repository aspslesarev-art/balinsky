'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { MessageCircle, X, Send, Loader2, AlertTriangle, BedDouble, MapPin, ExternalLink, Mic, Square, UserRound, Trash2 } from 'lucide-react'
import { useWishlist } from './WishlistContext'
import { RECENT_KEY, type RecentlyViewedEntry } from './PageViewTracker'
import type { Lang } from '@/lib/i18n'

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
  // true for the opening greeting (generic OR the per-listing contextual
  // one). Used to detect a "fresh" chat we may swap, and to drop the
  // greeting before sending history to the model.
  greeting?: boolean;
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
    greeting: true,
    content:
      'Я Балина — AI-брокер по недвижимости на Бали. Помогу подобрать объект под ваш бюджет и цели. Что вы ищете?\n\n' +
      '[CHIPS] Подобрать виллу | Подобрать апартаменты | Помесячная аренда | Юридика покупки | Связаться с менеджером',
  },
  en: {
    role: 'assistant',
    greeting: true,
    content:
      "I'm Balina — AI broker for Bali real estate. I'll help match a property to your budget and goals. What are you looking for?\n\n" +
      '[CHIPS] Pick a villa | Pick an apartment | Monthly rental | Legal side of buying | Contact a manager',
  },
}

// On a listing detail page Балина greets ABOUT that listing and offers to dig
// in — so the visitor lands straight into a conversation about what they're
// looking at. Only villa / apartment / complex get this (the user's ask).
type ListingKind = 'villa' | 'apartment' | 'complex'

function parseListingPath(pathname: string): { kind: ListingKind; slug: string } | null {
  const patterns: { re: RegExp; kind: ListingKind }[] = [
    { re: /^\/(?:ru\/villy|en\/villas)\/o\/([^/?#]+)/, kind: 'villa' },
    { re: /^\/(?:ru\/apartamenty|en\/apartments)\/o\/([^/?#]+)/, kind: 'apartment' },
    { re: /^\/(?:ru\/zhilye-kompleksy|en\/complexes)\/o\/([^/?#]+)/, kind: 'complex' },
  ]
  for (const p of patterns) {
    const m = pathname.match(p.re)
    if (m) return { kind: p.kind, slug: m[1] }
  }
  return null
}

function contextualGreeting(kind: ListingKind, title: string | null, lang: Lang): Message {
  const obj = {
    villa: { ru: 'эту виллу', en: 'this villa' },
    apartment: { ru: 'эти апартаменты', en: 'these apartments' },
    complex: { ru: 'этот комплекс', en: 'this complex' },
  }[kind][lang]
  const name = title ? (lang === 'en' ? `“${title}”` : `«${title}»`) : (lang === 'en' ? 'this listing' : 'этот объект')
  const content = lang === 'en'
    ? `You're looking at ${name}. Want me to walk you through ${obj}? I'll check the base and answer precisely — documents, real yield, handover date, what's nearby, risks.\n\n[CHIPS] Tell me about it | Documents & risks | Real yield | Handover date | What's nearby`
    : `Вижу, вы смотрите ${name}. Рассказать про ${obj}? Сверюсь с базой и отвечу точно — документы, реальная доходность, сроки сдачи, что рядом, риски.\n\n[CHIPS] Рассказать про объект | Документы и риски | Реальная доходность | Когда сдают? | Что рядом`
  return { role: 'assistant', greeting: true, content }
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
    rec: {
      recording: 'Запись',
      transcribing: 'Распознаю…',
      retrying: 'Сбой сети, пробую ещё раз…',
      failed: 'Не получилось распознать',
      silentTitle: 'Вы молчите',
      silentHint: 'Закончить или продолжить?',
      finishBtn: 'Готово',
      continueBtn: 'Продолжить',
      stopBtn: 'Остановить',
      cancelBtn: 'Отменить',
      retryBtn: 'Повторить',
      micDenied: 'Доступ к микрофону запрещён',
      micError: 'Не получилось включить микрофон',
    },
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
    rec: {
      recording: 'Recording',
      transcribing: 'Transcribing…',
      retrying: 'Network hiccup, retrying…',
      failed: 'Could not transcribe',
      silentTitle: 'You\'re silent',
      silentHint: 'Finish or keep recording?',
      finishBtn: 'Done',
      continueBtn: 'Keep recording',
      stopBtn: 'Stop',
      cancelBtn: 'Cancel',
      retryBtn: 'Retry',
      micDenied: 'Microphone access denied',
      micError: 'Could not start the microphone',
    },
  },
} as const

export function ConsultantWidget() {
  // Lang follows the URL: /en/* → English, anything else → Russian.
  // Greeting + UI copy + voice recognition locale + the lang directive
  // we send to the chat API all key off this.
  const pathname = usePathname() ?? ''
  const lang: Lang = pathname.startsWith('/en') ? 'en' : 'ru'
  const c = COPY[lang]
  const { items: wishlistItems } = useWishlist()

  // Per-listing context for the page the visitor is on. `pageTitle` is read
  // from recentlyViewed (PageViewTracker writes it on mount) so the greeting
  // can name the object; falls back to a generic "this listing".
  const listingPage = parseListingPath(pathname)
  const listingKey = listingPage ? `${listingPage.kind}:${listingPage.slug}` : null
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const greeting = useMemo<Message>(
    () => (listingPage ? contextualGreeting(listingPage.kind, pageTitle, lang) : GREETING_BY_LANG[lang]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listingKey, pageTitle, lang],
  )

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([greeting])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // ===== Voice input (dictaphone-style) ================================
  //
  // Replaces the old browser SpeechRecognition path with a MediaRecorder
  // flow: tap mic → record raw audio → tap stop → POST to
  // /api/transcribe → text appended to input.
  //
  // Why not Web Speech API: real-time word-by-word leaks recognition
  // mistakes into the UI while the visitor is still speaking, doesn't
  // work in Safari at all, and silently fails on weak networks. Raw
  // capture + server-side Whisper is more reliable + matches Telegram
  // behaviour + keeps the audio blob alive so we never throw away
  // speech the visitor already gave us.
  type RecState =
    | { kind: 'idle' }
    | { kind: 'recording'; silent: boolean }
    | { kind: 'transcribing'; blob: Blob; attempt: number }
    | { kind: 'failed'; blob: Blob }
  const [recState, setRecState] = useState<RecState>({ kind: 'idle' })
  const [recElapsed, setRecElapsed] = useState(0)   // seconds, ticks while recording
  const [recLevel, setRecLevel] = useState(0)       // 0..1, drives the level meter

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const recStartedAtRef = useRef(0)
  const lastSoundAtRef = useRef(0)
  // Input value at the moment recording started. Transcribed text
  // appends to this instead of overwriting whatever the visitor had
  // already typed before tapping mic.
  const baseInputRef = useRef('')

  const SILENCE_MS = 3500   // peak below threshold for this long → show finish prompt
  const SILENCE_LEVEL = 0.04
  const MAX_RECORDING_MS = 60_000   // hard cap, force-stop at 60s
  // Tracks whether the localStorage hydrate ran so the persistence
  // useEffect below doesn't immediately overwrite stored history with
  // the default greeting on the very first render.
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(
      typeof window.MediaRecorder !== 'undefined'
      && !!navigator.mediaDevices?.getUserMedia,
    )
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
        // Same deferral — getUserMedia sometimes throws if it runs
        // before the panel has finished its open animation.
        setTimeout(() => {
          if (recState.kind === 'idle') void startRecording()
        }, 80)
      }
    }
    window.addEventListener('balina:open', onOpen)
    return () => window.removeEventListener('balina:open', onOpen)
    // sendText / startRecording are stable closures over local state
    // we want to capture lazily — eslint-disable for the dep array is fine.
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

  // Swap the lone greeting when it changes — language flip OR navigating onto
  // a listing page (generic → contextual "tell me about THIS object"). Never
  // touch an in-progress chat (length > 1).
  useEffect(() => {
    setMessages(prev => {
      if (prev.length !== 1) return prev
      return prev[0]?.greeting === true ? [greeting] : prev
    })
  }, [greeting])

  // Read the current listing's title from recentlyViewed. PageViewTracker
  // writes it on the detail page's mount, which can be a tick after the widget
  // mounts — retry a few times, then give up (greeting falls back to generic
  // "this listing").
  useEffect(() => {
    if (!listingPage) { setPageTitle(null); return }
    let tries = 0
    const read = (): boolean => {
      try {
        const raw = localStorage.getItem(RECENT_KEY)
        if (raw) {
          const rv = JSON.parse(raw) as RecentlyViewedEntry[]
          const hit = rv.find(r => r.kind === listingPage.kind && r.slug === listingPage.slug)
          if (hit?.title) { setPageTitle(hit.title); return true }
        }
      } catch { /* storage off — stay on the generic phrasing */ }
      return false
    }
    if (read()) return
    const id = setInterval(() => { tries++; if (read() || tries > 6) clearInterval(id) }, 400)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingKey])

  // Proactive nudge above the launcher on a listing page — Балина offers to
  // walk through the object. Appears after a short beat, dismissable per
  // listing for the session so it doesn't nag.
  const [teaserReady, setTeaserReady] = useState(false)
  const [teaserClosed, setTeaserClosed] = useState(false)
  useEffect(() => {
    setTeaserReady(false); setTeaserClosed(false)
    if (!listingKey) return
    try { if (sessionStorage.getItem('balina.teaser.' + listingKey) === '1') { setTeaserClosed(true); return } } catch {}
    const id = setTimeout(() => setTeaserReady(true), 1300)
    return () => clearTimeout(id)
  }, [listingKey])
  const dismissTeaser = () => {
    setTeaserClosed(true)
    try { if (listingKey) sessionStorage.setItem('balina.teaser.' + listingKey, '1') } catch {}
  }

  // Clear all voice resources — stream tracks, audio context, RAF.
  // Safe to call from anywhere; idempotent.
  const cleanupRecording = () => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    const mr = mediaRecorderRef.current
    if (mr) {
      try { mr.stream.getTracks().forEach(t => t.stop()) } catch {}
      mediaRecorderRef.current = null
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch {}
      audioCtxRef.current = null
    }
    analyserRef.current = null
    setRecElapsed(0)
    setRecLevel(0)
  }

  // Pick a MIME type the browser supports. We accept any of the
  // common four — server side passes the blob to Azure transcribe
  // which is happy with all of them.
  const pickMime = (): string => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', '']
    if (typeof MediaRecorder === 'undefined') return ''
    for (const t of candidates) {
      if (!t) return ''
      try { if (MediaRecorder.isTypeSupported(t)) return t } catch {}
    }
    return ''
  }

  const startRecording = async () => {
    if (typeof window === 'undefined') return
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const mime = pickMime()
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      baseInputRef.current = input.trim()

      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' })
        cleanupRecording()
        if (blob.size < 1024) {
          // Less than 1 KB — visitor tapped record then immediately
          // stop with no audible speech. Just return to idle.
          setRecState({ kind: 'idle' })
          return
        }
        void submitAudio(blob, 0)
      }

      // Level + silence detection via AnalyserNode.
      const AudioCtx: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      src.connect(analyser)
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      recStartedAtRef.current = Date.now()
      lastSoundAtRef.current = Date.now()

      const tick = () => {
        if (!analyserRef.current) return
        analyser.getByteTimeDomainData(data)
        // Peak deviation from silence (128 is mid-point for uint8 PCM).
        let peak = 0
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i] - 128) / 128
          if (v > peak) peak = v
        }
        setRecLevel(peak)
        const now = Date.now()
        if (peak > SILENCE_LEVEL) lastSoundAtRef.current = now
        setRecElapsed(Math.round((now - recStartedAtRef.current) / 1000))

        const elapsed = now - recStartedAtRef.current
        const sinceSound = now - lastSoundAtRef.current
        const silent = sinceSound > SILENCE_MS && elapsed > SILENCE_MS
        setRecState(prev => (prev.kind === 'recording' && prev.silent !== silent ? { kind: 'recording', silent } : prev))

        // Hard cap — force-stop at MAX_RECORDING_MS.
        if (elapsed > MAX_RECORDING_MS) { recorder.stop(); return }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      recorder.start(250)   // emit chunks every 250 ms — smoother stop
      setRecState({ kind: 'recording', silent: false })
    } catch (e) {
      cleanupRecording()
      setRecState({ kind: 'idle' })
      const isDenied = e instanceof Error && /Permission|denied|NotAllowed/i.test(e.message)
      setError(isDenied ? c.rec.micDenied : c.rec.micError)
    }
  }

  // Visitor tapped "stop" or "done". MediaRecorder.onstop will fire
  // and pipe the blob into submitAudio.
  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    try { if (mr.state !== 'inactive') mr.stop() } catch {}
  }

  // Visitor tapped "cancel" — drop the audio entirely.
  const cancelRecording = () => {
    const mr = mediaRecorderRef.current
    chunksRef.current = []
    if (mr) {
      try { mr.ondataavailable = null } catch {}
      try { mr.onstop = () => { cleanupRecording(); setRecState({ kind: 'idle' }) } } catch {}
      try { if (mr.state !== 'inactive') mr.stop() } catch {}
    } else {
      cleanupRecording()
      setRecState({ kind: 'idle' })
    }
  }

  // POST the blob to /api/transcribe. Auto-retries twice on network
  // / 5xx errors; if still failing we surface 'failed' state with the
  // blob preserved so the visitor can tap "повторить" manually — the
  // audio is NEVER discarded until they decide.
  const submitAudio = async (blob: Blob, attempt: number) => {
    setRecState({ kind: 'transcribing', blob, attempt })
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'voice.webm')
      const r = await fetch('/api/transcribe', { method: 'POST', body: fd })
      if (!r.ok) throw new Error(`http_${r.status}`)
      const j = await r.json() as { text?: string; error?: string }
      const text = (j.text ?? '').trim()
      setRecState({ kind: 'idle' })
      if (text) {
        // Voice input is now auto-send — the visitor talked, we
        // transcribed, no extra tap on Send required. The pre-record
        // input value (if any) is concatenated in front so typed +
        // dictated context goes in the same message.
        const sep = baseInputRef.current && text ? ' ' : ''
        const full = baseInputRef.current + sep + text
        void sendText(full)
      }
    } catch {
      if (attempt < 2) {
        // Auto-retry on transient network failure — visitor never
        // has to think about it.
        setTimeout(() => { void submitAudio(blob, attempt + 1) }, 600)
      } else {
        setRecState({ kind: 'failed', blob })
      }
    }
  }

  // Stop recording / drop the audio context when the widget closes.
  useEffect(() => {
    if (!open) {
      cancelRecording()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // iOS Safari quirk: when the soft keyboard opens, the layout viewport
  // stays at its full height (so 100dvh is wrong), and the focused
  // input triggers an auto-scroll that drags `position: fixed` panels
  // along with the body — the chat header ends up off-screen. Pin the
  // panel size to `visualViewport` instead, which excludes the
  // keyboard's height and stays accurate while the visitor types.
  const [vvSize, setVvSize] = useState<{ h: number; w: number; offsetTop: number; offsetLeft: number } | null>(null)
  // The visual-viewport pin (and the full-screen inline sizing it drives) is a
  // MOBILE-only workaround. On desktop the panel must be the 400px corner card
  // the `sm:` utilities describe — but inline width/height/top/left would
  // override those classes and blow the panel up to fill the whole window. So
  // we only apply the inline sizing below the `sm` breakpoint (640px).
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  useEffect(() => {
    if (!open || !isMobile) return
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const update = () => setVvSize({
      h: vv.height,
      w: vv.width,
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft,
    })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setVvSize(null)
    }
  }, [open, isMobile])

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

      // Current page detection — parse pathname into a kind+slug pair
      // so the model knows EXACTLY which listing the visitor is staring
      // at when they say "что про эту виллу" / "какая доходность тут"
      // / "сколько лизхолд". Title comes from recentlyViewed (the
      // PageViewTracker writes it on mount); falls back to the slug
      // when not yet captured. URL routes are the canonical source —
      // we don't trust localStorage to contain the *current* page if
      // the user navigated and the widget already loaded.
      const currentPage = (() => {
        const PATTERNS: { re: RegExp; kind: RecentlyViewedEntry['kind'] }[] = [
          { re: /^\/(?:ru\/villy|en\/villas)\/o\/([^/?#]+)/,             kind: 'villa' },
          { re: /^\/(?:ru\/apartamenty|en\/apartments)\/o\/([^/?#]+)/,   kind: 'apartment' },
          { re: /^\/(?:ru\/zhilye-kompleksy|en\/complexes)\/o\/([^/?#]+)/, kind: 'complex' },
          { re: /^\/(?:ru\/zastrojshhiki|en\/developers)\/([^/?#]+)/,    kind: 'developer' },
          { re: /^\/(?:ru\/arenda|en\/rental)\/o\/([^/?#]+)/,            kind: 'rental' },
          { re: /^\/ru\/(?:meropriyatiya|novosti|akcii|znaniya)\/([^/?#]+)/, kind: 'event' },
        ]
        for (const p of PATTERNS) {
          const m = pathname.match(p.re)
          if (m) {
            const slug = m[1]
            const matched = recentlyViewed.find(r => r.kind === p.kind && r.slug === slug)
            return {
              kind: p.kind,
              slug,
              url: pathname,
              title: matched?.title ?? null,
              airtableId: matched?.airtableId ?? null,
            }
          }
        }
        return null
      })()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Drop the greeting before sending — model never needs to
          // see it. Pass current site language so the API can append
          // a "respond in English" directive when the visitor's on /en.
          messages: next.filter((m, i) => !(i === 0 && m.greeting)),
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
            currentPage,
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

  // Open the chat AND immediately ask Балину to walk the current listing — so a
  // tap on the proactive nudge / greeting lands the visitor straight into a
  // short rundown instead of a question they'd have to answer themselves.
  const tellAboutCurrent = () => {
    setOpen(true)
    setError(null)
    const prompt = lang === 'en'
      ? 'Give me a short rundown of this listing — the essentials: what it is, documents (PBG/SLF), real yield, handover date, what\'s nearby and any risks.'
      : 'Расскажи коротко про этот объект — самое главное: что это, документы (PBG/SLF), реальная доходность, сроки сдачи, что рядом и есть ли риски.'
    // Defer one tick so the panel paints before the request kicks off.
    setTimeout(() => { void sendText(prompt) }, 60)
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={c.triggerAria}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white shadow-lg transition-colors"
        >
          <Image
            src="/balina.jpg"
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white/40"
          />
          <span className="text-[14px] font-medium hidden sm:inline">{c.triggerName}</span>
          <MessageCircle size={16} className="sm:hidden" />
        </button>
      )}

      {/* Proactive nudge on a listing page — Балина offers to walk the object. */}
      {!open && listingPage && teaserReady && !teaserClosed && (
        <div className="fixed bottom-[78px] right-5 z-40 max-w-[240px] flex items-stretch rounded-2xl bg-white shadow-[0_10px_34px_rgba(0,0,0,0.18)] border border-[var(--color-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => { dismissTeaser(); tellAboutCurrent() }}
            className="flex items-center gap-2 pl-2.5 pr-1.5 py-2 text-left"
          >
            <Image src="/balina.jpg" alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
            <span className="text-[12.5px] leading-snug text-[#111827]">
              {lang === 'en' ? 'Want the rundown on this one?' : 'Рассказать про этот объект?'}
            </span>
          </button>
          <button
            type="button"
            onClick={dismissTeaser}
            aria-label={c.closeAria}
            className="shrink-0 px-1.5 text-[var(--color-text-muted)] hover:text-[#111827]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed sm:inset-auto sm:bottom-5 sm:right-5 sm:left-auto sm:top-auto sm:w-[400px] sm:h-[640px] sm:max-h-[calc(100vh-40px)] z-50 flex flex-col bg-white sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:border sm:border-[var(--color-border)] overflow-hidden"
            style={isMobile ? {
              // Mobile only: pin both POSITION and SIZE to the visual
              // viewport. iOS Safari can resize *either* axis when
              // the keyboard / accessibility zoom kicks in; binding
              // width too keeps the panel from spilling past the
              // visible screen on the right. On desktop we pass no
              // inline style so the `sm:` utilities (400px corner
              // card) win — an inline width/height/top/left would
              // override them and fill the whole window.
              top: vvSize ? `${vvSize.offsetTop}px` : 0,
              left: vvSize ? `${vvSize.offsetLeft}px` : 0,
              width: vvSize ? `${vvSize.w}px` : '100vw',
              height: vvSize ? `${vvSize.h}px` : '100dvh',
            } : undefined}
          >
            {/* Header — sticky inside the flex container so even if
                the message list tries to scroll, the title row + ✕
                button always stay visible. */}
            <div className="shrink-0 sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-primary-soft)]">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/balina.jpg"
                  alt=""
                  width={36}
                  height={36}
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

            {/* Voice recording overlay — covers the input area while a
                recording / transcription is in flight. Visitor can stop,
                cancel, retry, or confirm finish-on-silence from here. */}
            {recState.kind !== 'idle' && (
              <div className="shrink-0 border-t border-[var(--color-border)] bg-white p-3">
                <VoiceOverlay
                  state={recState}
                  elapsed={recElapsed}
                  level={recLevel}
                  copy={c.rec}
                  onStop={stopRecording}
                  onCancel={cancelRecording}
                  onRetry={() => {
                    if (recState.kind === 'failed') void submitAudio(recState.blob, 0)
                  }}
                />
              </div>
            )}

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
                placeholder={recState.kind === 'transcribing' ? c.rec.transcribing : c.placeholder}
                rows={2}
                disabled={loading || recState.kind !== 'idle'}
                // iOS Safari auto-zooms ANY input/textarea whose
                // computed font-size is below 16 px. That zoom widens
                // the layout viewport, pushing the chat panel past
                // the visible area. 16 px on mobile prevents the
                // zoom; sm+ keeps the original 14 px density.
                className="flex-1 resize-none min-h-[48px] max-h-32 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-[16px] sm:text-[14px] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
              />
              {voiceSupported && recState.kind === 'idle' && (
                <button
                  type="button"
                  onClick={() => { void startRecording() }}
                  disabled={loading}
                  aria-label={c.voiceStartAria}
                  title={c.voiceStartTitle}
                  className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 text-[#111827] disabled:opacity-50"
                >
                  <Mic size={18} />
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
      <div className="relative shrink-0 w-[88px] h-[88px] bg-[var(--color-search-bg)]">
        {card.photo ? (
          <Image src={card.photo} alt="" fill sizes="88px" className="object-cover" />
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

// Voice-recording overlay shown above the chat input while a recording
// is captured / transcribed. Pure presentational — all state + actions
// flow in from the parent.
type RecOverlayState =
  | { kind: 'recording'; silent: boolean }
  | { kind: 'transcribing'; attempt: number }
  | { kind: 'failed' }

type VoiceCopy = {
  recording: string
  transcribing: string
  retrying: string
  failed: string
  silentTitle: string
  silentHint: string
  finishBtn: string
  continueBtn: string
  stopBtn: string
  cancelBtn: string
  retryBtn: string
}

function VoiceOverlay({
  state, elapsed, level, copy,
  onStop, onCancel, onRetry,
}: {
  state: RecOverlayState
  elapsed: number
  level: number
  copy: VoiceCopy
  onStop: () => void
  onCancel: () => void
  onRetry: () => void
}) {
  const mm = String(Math.floor(elapsed / 60)).padStart(1, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const time = `${mm}:${ss}`

  // Recording — live level meter + timer + Stop / Cancel.
  if (state.kind === 'recording' && !state.silent) {
    return (
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-3 h-3 rounded-full bg-[#DC2626] animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium text-[#111827]">{copy.recording}</span>
            <span className="text-[12px] font-mono text-[#6B7280] tabular-nums">{time}</span>
          </div>
          <div className="mt-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
            <div className="h-full bg-[#1F8B5F] transition-[width] duration-75" style={{ width: `${Math.min(100, Math.round(level * 200))}%` }} />
          </div>
        </div>
        <button type="button" onClick={onCancel} className="text-[12px] text-[#6B7280] hover:text-[#111827] px-2 py-1">
          {copy.cancelBtn}
        </button>
        <button type="button" onClick={onStop} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1F8B5F] hover:bg-[#197551] text-white">
          <Square size={14} />
        </button>
      </div>
    )
  }

  // Silent — pulse-stops, prompt "are you done?" with two big buttons.
  if (state.kind === 'recording' && state.silent) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-[#111827]">{copy.silentTitle}</div>
          <div className="text-[12px] text-[#6B7280] mt-0.5">{copy.silentHint}</div>
        </div>
        <button type="button" onClick={onCancel} className="text-[12px] text-[#6B7280] hover:text-[#111827] px-2 py-1">
          {copy.cancelBtn}
        </button>
        <button type="button" onClick={onStop} className="px-4 h-10 rounded-full bg-[#1F8B5F] hover:bg-[#197551] text-white text-[13px] font-medium">
          {copy.finishBtn}
        </button>
      </div>
    )
  }

  // Transcribing — spinner + status (notes auto-retry if attempt > 0).
  if (state.kind === 'transcribing') {
    return (
      <div className="flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-[#1F8B5F]" />
        <div className="flex-1 text-[13px] text-[#111827]">
          {state.attempt > 0 ? copy.retrying : copy.transcribing}
        </div>
        <button type="button" onClick={onCancel} className="text-[12px] text-[#6B7280] hover:text-[#111827] px-2 py-1">
          {copy.cancelBtn}
        </button>
      </div>
    )
  }

  // Failed — manual retry, audio blob still preserved.
  return (
    <div className="flex items-center gap-3">
      <AlertTriangle size={16} className="text-[#DC2626]" />
      <div className="flex-1 text-[13px] text-[#111827]">{copy.failed}</div>
      <button type="button" onClick={onCancel} className="text-[12px] text-[#6B7280] hover:text-[#111827] px-2 py-1">
        {copy.cancelBtn}
      </button>
      <button type="button" onClick={onRetry} className="px-4 h-10 rounded-full bg-[#1F8B5F] hover:bg-[#197551] text-white text-[13px] font-medium">
        {copy.retryBtn}
      </button>
    </div>
  )
}
