'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BellRing, Loader2, Send, X } from 'lucide-react'
import type { HotelLang, HotelMessage, HotelRequest, HotelService, RequestStatus } from '@/lib/hotel/db'

// Экран гостя. Всё, что он умеет: написать на стойку и заказать услугу
// кнопкой. Ни регистрации, ни приложения — только ссылка из QR в номере.

type State = {
  hotel: { name: string; lang: HotelLang }
  room: { label: string }
  stay: { id: number; guest_name: string | null } | null
  services: HotelService[]
  messages: HotelMessage[]
  requests: HotelRequest[]
}

const T = {
  ru: {
    room: 'Номер',
    services: 'Заказать',
    chatTitle: 'Сообщение на стойку',
    placeholder: 'Напишите, что нужно…',
    send: 'Отправить',
    yourName: 'Ваше имя (необязательно)',
    comment: 'Комментарий (необязательно)',
    cancel: 'Отмена',
    order: 'Заказать',
    empty: 'Здесь появятся ответы стойки. Напишите — обычно отвечают за несколько минут.',
    orders: 'Ваши заказы',
    staff: 'Стойка',
    you: 'Вы',
    failed: 'Не отправилось. Проверьте связь и попробуйте ещё раз.',
    status: { new: 'Принят', in_progress: 'Готовим', done: 'Готово', declined: 'Отклонён' } as Record<RequestStatus, string>,
  },
  en: {
    room: 'Room',
    services: 'Order',
    chatTitle: 'Message the front desk',
    placeholder: 'Tell us what you need…',
    send: 'Send',
    yourName: 'Your name (optional)',
    comment: 'Comment (optional)',
    cancel: 'Cancel',
    order: 'Order',
    empty: 'Replies from the front desk show up here. Write to us — it usually takes a few minutes.',
    orders: 'Your orders',
    staff: 'Front desk',
    you: 'You',
    failed: 'Not sent. Check your connection and try again.',
    status: { new: 'Received', in_progress: 'In progress', done: 'Done', declined: 'Declined' } as Record<RequestStatus, string>,
  },
} as const

const POLL_MS = 6000

function serviceTitle(s: HotelService, lang: HotelLang): string {
  return lang === 'en' ? (s.title_en || s.title) : s.title
}

// В заказе название сохранено так, как его видит стойка (по-русски). Гостю
// показываем его же услугу на его языке — иначе в английском интерфейсе
// «Fresh towels» превращается в «Свежие полотенца».
function requestTitle(r: HotelRequest, services: HotelService[], lang: HotelLang): string {
  const service = r.service_code ? services.find(s => s.code === r.service_code) : undefined
  return service ? serviceTitle(service, lang) : r.title
}

function time(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

export function GuestRoom({
  token, hotelName, roomLabel, defaultLang,
}: { token: string; hotelName: string; roomLabel: string; defaultLang: HotelLang }) {
  const [lang, setLang] = useState<HotelLang>(defaultLang)
  const [state, setState] = useState<State | null>(null)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  const [picked, setPicked] = useState<HotelService | null>(null)
  const [note, setNote] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  const t = T[lang]

  // Язык гость выбирает один раз — и на своём телефоне, а не за весь номер.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stay_lang')
      if (saved === 'ru' || saved === 'en') setLang(saved)
    } catch { /* приватный режим — остаёмся на языке отеля */ }
  }, [])
  const switchLang = (next: HotelLang) => {
    setLang(next)
    try { localStorage.setItem('stay_lang', next) } catch { /* см. выше */ }
  }

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/stay/${token}`, { cache: 'no-store' })
      if (r.ok) setState(await r.json())
    } catch { /* оффлайн — следующий тик подтянет */ }
  }, [token])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    // Возврат к вкладке — сразу свежее состояние, не ждём следующий тик.
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [load])

  const messages = state?.messages ?? []
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const sendMessage = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true); setError(false)
    try {
      const r = await fetch(`/api/stay/${token}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body, name: name.trim() || undefined }),
      })
      if (!r.ok) throw new Error('send failed')
      setText('')
      await load()
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  const sendOrder = async () => {
    if (!picked || sending) return
    setSending(true); setError(false)
    try {
      const r = await fetch(`/api/stay/${token}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceCode: picked.code, note: note.trim() || undefined }),
      })
      if (!r.ok) throw new Error('order failed')
      setPicked(null); setNote('')
      await load()
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  const openRequests = (state?.requests ?? []).filter(r => r.status !== 'done' && r.status !== 'declined')
  const askName = state?.stay?.guest_name == null

  return (
    <main className="min-w-0 mx-auto flex min-h-screen w-full max-w-lg flex-col bg-white text-neutral-900">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold">{hotelName}</div>
          <div className="text-[13px] text-neutral-500">{t.room} {roomLabel}</div>
        </div>
        <div className="flex shrink-0 rounded-full border border-neutral-200 p-0.5 text-[12px]">
          {(['en', 'ru'] as const).map(l => (
            <button
              key={l}
              onClick={() => switchLang(l)}
              className={`rounded-full px-2.5 py-1 uppercase ${lang === l ? 'bg-neutral-900 text-white' : 'text-neutral-500'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      {state && state.services.length > 0 && (
        <section className="border-b border-neutral-200 px-5 py-4">
          <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-neutral-400">{t.services}</div>
          <div className="grid grid-cols-2 gap-2">
            {state.services.map(s => (
              <button
                key={s.id}
                onClick={() => { setPicked(s); setNote('') }}
                className="rounded-xl border border-neutral-200 px-3 py-3 text-left text-[14px] font-medium hover:border-neutral-900"
              >
                <span className="block">{serviceTitle(s, lang)}</span>
                {s.price_usd != null && (
                  <span className="mt-0.5 block text-[12px] font-normal text-neutral-500">${s.price_usd}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {openRequests.length > 0 && (
        <section className="border-b border-neutral-200 px-5 py-3">
          <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-neutral-400">{t.orders}</div>
          <ul className="space-y-1.5">
            {openRequests.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate">{requestTitle(r, state?.services ?? [], lang)}</span>
                <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[12px] text-neutral-600">
                  {t.status[r.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="mt-6 text-center text-[14px] leading-relaxed text-neutral-400">{t.empty}</p>
        ) : messages.map(m => (
          <div key={m.id} className={m.author === 'guest' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
                m.author === 'guest' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-900'
              }`}
            >
              {m.author === 'staff' && (
                <div className="mb-0.5 text-[11px] font-medium text-neutral-500">{m.staff_name || t.staff}</div>
              )}
              <div className="whitespace-pre-wrap break-words">{m.body}</div>
              <div className={`mt-0.5 text-[11px] ${m.author === 'guest' ? 'text-white/50' : 'text-neutral-400'}`}>
                {time(m.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-200 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {error && <div className="mb-2 text-[13px] text-red-600">{t.failed}</div>}
        {askName && (
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t.yourName}
            className="mb-2 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-[15px] outline-none focus:border-neutral-900"
          />
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            rows={1}
            placeholder={t.placeholder}
            className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-neutral-900"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !text.trim()}
            aria-label={t.send}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {picked && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4" onClick={() => setPicked(null)}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-3">
              <div className="text-[16px] font-semibold">{serviceTitle(picked, lang)}</div>
              <button onClick={() => setPicked(null)} aria-label={t.cancel} className="text-neutral-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            {picked.note && <p className="mb-3 text-[13px] text-neutral-500">{picked.note}</p>}
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder={t.comment}
              className="mb-3 w-full resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-neutral-900"
            />
            <button
              onClick={sendOrder}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-[15px] font-medium text-white disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
              {t.order}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
