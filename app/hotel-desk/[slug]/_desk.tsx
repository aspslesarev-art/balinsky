'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, DoorOpen, Loader2, LogOut, Send } from 'lucide-react'
import type { DeskRequest, DeskRoom, HotelMessage, RequestStatus } from '@/lib/hotel/db'

// Панель стойки: слева номера, справа переписка выбранного номера и его
// заявки. На телефоне это два экрана — список и номер, — потому что
// администратор чаще стоит с телефоном, чем сидит за монитором.

type State = { rooms: DeskRoom[]; requests: DeskRequest[]; messages: HotelMessage[] }

const POLL_MS = 5000

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  done: 'Готово',
  declined: 'Отклонён',
}
const STATUS_TONE: Record<RequestStatus, string> = {
  new: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-neutral-100 text-neutral-500',
}

function time(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

export function Desk({ slug, hotelName }: { slug: string; hotelName: string }) {
  const [state, setState] = useState<State>({ rooms: [], requests: [], messages: [] })
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [staffName, setStaffName] = useState('')
  const [sending, setSending] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  // Имя дежурного подставляется в подпись ответа — гость видит, кто пишет.
  useEffect(() => {
    try { setStaffName(localStorage.getItem('desk_staff_name') ?? '') } catch { /* приватный режим */ }
  }, [])
  const rememberName = (v: string) => {
    setStaffName(v)
    try { localStorage.setItem('desk_staff_name', v) } catch { /* см. выше */ }
  }

  const current = state.rooms.find(r => r.room.id === selectedRoom) ?? null
  const currentStayId = current?.stay?.id ?? null

  const load = useCallback(async (stayId: number | null) => {
    try {
      const url = stayId ? `/api/hotel-desk/${slug}/state?stay=${stayId}` : `/api/hotel-desk/${slug}/state`
      const r = await fetch(url, { cache: 'no-store' })
      if (r.status === 401) { window.location.href = '/hotel-desk'; return }
      if (r.ok) {
        const data = await r.json()
        setState({ rooms: data.rooms ?? [], requests: data.requests ?? [], messages: data.messages ?? [] })
      }
    } catch { /* оффлайн — следующий тик подтянет */ }
  }, [slug])

  useEffect(() => {
    load(currentStayId)
    const id = setInterval(() => load(currentStayId), POLL_MS)
    return () => clearInterval(id)
  }, [load, currentStayId])

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state.messages.length, selectedRoom])

  const send = async () => {
    const body = text.trim()
    if (!body || !current || sending) return
    setSending(true)
    try {
      const r = await fetch(`/api/hotel-desk/${slug}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stayId: current.stay?.id, roomId: current.room.id, text: body, staffName: staffName || undefined,
        }),
      })
      if (r.ok) {
        setText('')
        const { stayId } = await r.json()
        await load(stayId ?? currentStayId)
      }
    } finally {
      setSending(false)
    }
  }

  const setStatus = async (id: number, status: RequestStatus) => {
    await fetch(`/api/hotel-desk/${slug}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await load(currentStayId)
  }

  const checkout = async () => {
    if (!current?.stay) return
    if (!confirm(`Закрыть смену в номере ${current.room.label}? Переписка и заказы уедут в архив.`)) return
    await fetch(`/api/hotel-desk/${slug}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stayId: current.stay.id }),
    })
    setSelectedRoom(null)
    await load(null)
  }

  const logout = async () => {
    await fetch('/api/hotel-desk/logout', { method: 'POST' })
    window.location.href = '/hotel-desk'
  }

  const roomRequests = current ? state.requests.filter(r => r.room_id === current.room.id) : []
  const totalOpen = state.requests.filter(r => r.status === 'new' || r.status === 'in_progress').length

  return (
    <main className="flex min-h-screen min-w-0 flex-col bg-neutral-50 md:h-screen md:flex-row md:overflow-hidden">
      {/* Список номеров: на телефоне прячется, когда открыт номер */}
      <aside className={`${selectedRoom ? 'hidden md:flex' : 'flex'} min-w-0 flex-col border-neutral-200 bg-white md:w-80 md:shrink-0 md:border-r`}>
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold">{hotelName}</div>
            <div className="text-[13px] text-neutral-500">
              {totalOpen > 0 ? `${totalOpen} открытых заявок` : 'Открытых заявок нет'}
            </div>
          </div>
          <button onClick={logout} aria-label="Выйти" className="shrink-0 text-neutral-400 hover:text-neutral-900">
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <input
          value={staffName}
          onChange={e => rememberName(e.target.value)}
          placeholder="Кто на смене (подпись в ответах)"
          className="border-b border-neutral-200 px-5 py-2.5 text-[14px] outline-none placeholder:text-neutral-400"
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {state.rooms.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-neutral-400">
              Номеров пока нет — их заводят в админке, в разделе «Отели».
            </p>
          ) : state.rooms.map(r => (
            <button
              key={r.room.id}
              onClick={() => setSelectedRoom(r.room.id)}
              className={`flex w-full items-start gap-3 border-b border-neutral-100 px-5 py-3 text-left hover:bg-neutral-50 ${
                selectedRoom === r.room.id ? 'bg-neutral-50' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium">{r.room.label}</span>
                  {r.stay?.guest_name && (
                    <span className="truncate text-[13px] text-neutral-500">{r.stay.guest_name}</span>
                  )}
                </div>
                <div className="truncate text-[13px] text-neutral-400">
                  {r.lastMessage ?? (r.stay ? 'Заехали, сообщений нет' : 'Свободен')}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {r.unread > 0 && (
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-white">
                    {r.unread}
                  </span>
                )}
                {r.openRequests > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                    {r.openRequests}
                  </span>
                )}
                {r.lastMessageAt && <span className="text-[11px] text-neutral-400">{time(r.lastMessageAt)}</span>}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Номер: переписка + его заявки */}
      <section className={`${selectedRoom ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-white`}>
        {!current ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] text-neutral-400">
            Выберите номер слева.
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 md:px-5">
              <button onClick={() => setSelectedRoom(null)} aria-label="Назад" className="text-neutral-500 md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-semibold">Номер {current.room.label}</div>
                <div className="truncate text-[13px] text-neutral-500">
                  {current.stay?.guest_name ?? (current.stay ? 'Гость без имени' : 'Смена не открыта')}
                </div>
              </div>
              {current.stay && (
                <button
                  onClick={checkout}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-[13px] text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
                >
                  <DoorOpen className="h-4 w-4" /> Выезд
                </button>
              )}
            </header>

            {roomRequests.length > 0 && (
              <div className="max-h-56 overflow-y-auto border-b border-neutral-200 px-4 py-3 md:px-5">
                <ul className="space-y-2">
                  {roomRequests.map(r => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_TONE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                      <span className="min-w-0 flex-1 text-[14px]">
                        {r.title}
                        {/* Телефон и время гость оставил в форме — стойке не надо
                            их выпрашивать в переписке. */}
                        {(r.contact_whatsapp || r.preferred_time) && (
                          <span className="ml-2 text-[12px] text-neutral-500">
                            {[r.preferred_time, r.contact_whatsapp].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      {r.status === 'new' && (
                        <button
                          onClick={() => setStatus(r.id, 'in_progress')}
                          className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[12px] hover:border-neutral-900"
                        >
                          Взял
                        </button>
                      )}
                      {(r.status === 'new' || r.status === 'in_progress') && (
                        <button
                          onClick={() => setStatus(r.id, 'done')}
                          className="flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1 text-[12px] text-white"
                        >
                          <Check className="h-3.5 w-3.5" /> Готово
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-5">
              {state.messages.length === 0 ? (
                <p className="mt-6 text-center text-[14px] text-neutral-400">Сообщений пока нет.</p>
              ) : state.messages.map(m => (
                <div key={m.id} className={m.author === 'staff' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
                      m.author === 'staff' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-900'
                    }`}
                  >
                    {m.author === 'staff' && m.staff_name && (
                      <div className="mb-0.5 text-[11px] text-white/60">{m.staff_name}</div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className={`mt-0.5 text-[11px] ${m.author === 'staff' ? 'text-white/50' : 'text-neutral-400'}`}>
                      {time(m.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-5">
              <div className="flex items-end gap-2">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  rows={1}
                  placeholder="Ответить гостю…"
                  className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-neutral-900"
                />
                <button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  aria-label="Отправить"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
