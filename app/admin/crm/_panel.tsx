'use client'

// Карточка контакта: выжимка сверху, переписка целиком снизу.
// На компьютере — панель справа, на телефоне — экран целиком, кнопка
// «Открыть в Telegram» прибита к низу, под большой палец.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  X, Send, Users, Mic, Image as ImageIcon, Video, CircleDot, FileText, Sticker, Vote, Music, Film,
  MapPin, Contact, Paperclip, Loader2, MessageCircleReply, ArrowDown, ChevronUp,
} from 'lucide-react'
import { openPromises, telegramLink, type CrmContact, type CrmMessage, type CrmPromise, type TranscriptPage } from '@/lib/tg-crm/types'
import { MoneyLine, relDay, relTint } from './_ui'

const FIRST_PAGE = 200
const MORE_PAGE = 300

const MEDIA: Record<string, { label: string; Icon: typeof Mic }> = {
  voice: { label: 'голосовое', Icon: Mic },
  audio: { label: 'аудио', Icon: Music },
  photo: { label: 'фото', Icon: ImageIcon },
  video: { label: 'видео', Icon: Video },
  video_note: { label: 'кружок', Icon: CircleDot },
  animation: { label: 'GIF', Icon: Film },
  document: { label: 'файл', Icon: FileText },
  sticker: { label: 'стикер', Icon: Sticker },
  poll: { label: 'опрос', Icon: Vote },
  location: { label: 'место', Icon: MapPin },
  geo: { label: 'место', Icon: MapPin },
  contact: { label: 'контакт', Icon: Contact },
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CrmPanel({ contact: c, onClose }: { contact: CrmContact; onClose: () => void }) {
  const scrollRef = useRef<HTMLElement>(null)
  const chatRef = useRef<HTMLElement>(null)

  // Esc закрывает, фон не прокручивается под панелью — как в «Агентах».
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const tg = telegramLink(c)
  const mine = sortPromises(c.my_promises)
  const theirs = sortPromises(c.their_promises)
  const money = [...c.money].sort((a, b) => Number(a.settled) - Number(b.settled))

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/40" onClick={onClose} aria-hidden />
      <aside
        ref={scrollRef}
        role="dialog"
        aria-label={`Контакт: ${c.name}`}
        className="fixed z-[60] inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[600px] bg-[var(--ax-bg)] md:border-l border-[var(--ax-border)] overflow-y-auto overscroll-contain flex flex-col"
      >
        <header className="sticky top-0 z-[2] flex items-start gap-3 px-4 md:px-6 py-4 bg-[var(--ax-bg)] border-b border-[var(--ax-border-soft)]">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-[var(--ax-fg)] leading-tight break-words">
              {c.kind === 'group' && <Users size={18} className="shrink-0 text-[var(--ax-fg-faint)]" aria-label="группа" />}
              <span className="min-w-0">{c.name}</span>
            </h2>
            <div className="mt-1 text-[13px] text-[var(--ax-fg-muted)] leading-snug break-words">
              {[c.username ? `@${c.username}` : null, c.who].filter(Boolean).join(' · ') || 'Кто это — не разобрано'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-lg text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 px-4 md:px-6 pt-4 pb-8 flex flex-col gap-6">
          {/* Короткие факты одной строкой */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-[var(--ax-fg-muted)]">
            {c.category && <span className="px-1.5 py-px rounded text-[var(--ax-fg-soft)] bg-[var(--ax-hover)]">{c.category}</span>}
            {c.status && !c.awaiting_reply && <span>{c.status}</span>}
            <span className="tabular-nums">{c.msg_count.toLocaleString('ru-RU')} сообщ., моих {c.my_msg_count.toLocaleString('ru-RU')}</span>
            {c.kind === 'group' && c.members != null && <span className="tabular-nums">{c.members} участн.</span>}
            {c.last_at && <span>последнее {relDay(c.last_at)}</span>}
          </div>

          {c.awaiting_reply && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--ax-prospect-maybe-bg)] text-[var(--ax-prospect-maybe-fg)]">
              <MessageCircleReply size={16} className="shrink-0 mt-0.5" />
              <div className="text-[14px] leading-relaxed break-words">
                <span className="font-semibold">Ждёт от тебя: </span>
                {c.awaiting_what || 'ответа'}
              </div>
            </div>
          )}

          {!c.analyzed && (
            <p className="text-[13px] text-[var(--ax-fg-muted)] leading-relaxed max-w-[68ch]">
              Короткий или односторонний чат — подробного разбора нет. Вся переписка ниже.
            </p>
          )}

          {mine.length > 0 && (
            <Section title={`Я обещал · открыто ${openPromises(mine).length}`}>
              <PromiseList items={mine} />
            </Section>
          )}

          {money.length > 0 && (
            <Section title="Деньги">
              <ul className="flex flex-col gap-2">
                {money.map((m, i) => (
                  <li key={i} className={`flex items-start gap-2 ${m.settled ? 'opacity-50' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <MoneyLine m={m} />
                    </div>
                    <span className="shrink-0 text-[11.5px] text-[var(--ax-fg-faint)] whitespace-nowrap pt-0.5">
                      {m.settled ? 'закрыто' : fmtDate(m.date) ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {c.next_action && (
            <Section title="Что сделать дальше">
              <p className="text-[14px] text-[var(--ax-fg)] leading-relaxed break-words max-w-[68ch]">{c.next_action}</p>
            </Section>
          )}

          {theirs.length > 0 && (
            <Section title={`Мне обещали · открыто ${openPromises(theirs).length}`}>
              <PromiseList items={theirs} />
            </Section>
          )}

          {c.relationship != null && (
            <Section title="Отношения">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-semibold tabular-nums leading-none" style={{ color: relTint(c.relationship) }}>{c.relationship}</span>
                <span className="text-[13px] text-[var(--ax-fg-faint)]">из 10</span>
                <span className="ml-2 self-center w-24 h-1.5 rounded-full bg-[var(--ax-hover)] overflow-hidden" aria-hidden>
                  <span className="block h-full rounded-full" style={{ width: `${c.relationship * 10}%`, background: relTint(c.relationship) }} />
                </span>
              </div>
              {c.relationship_why && (
                <p className="mt-2 text-[13.5px] text-[var(--ax-fg-soft)] leading-relaxed break-words max-w-[68ch]">{c.relationship_why}</p>
              )}
            </Section>
          )}

          {c.summary && (
            <Section title="О чём общались">
              <LongText text={c.summary} />
            </Section>
          )}

          <Transcript chatId={c.chat_id} isGroup={c.kind === 'group'} scrollRef={scrollRef} anchorRef={chatRef} />
        </div>

        {/* Низ панели: действие под большой палец */}
        <footer className="sticky bottom-0 z-[2] flex items-center gap-2 px-4 md:px-6 py-3 bg-[var(--ax-bg)] border-t border-[var(--ax-border-soft)] pb-[max(12px,env(safe-area-inset-bottom))]">
          {tg ? (
            <a
              href={tg}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg text-[14px] font-medium bg-[#1F8B5F] hover:bg-[#197551] text-white no-underline transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
            >
              <Send size={16} />
              Открыть в Telegram
            </a>
          ) : (
            <span className="flex-1 text-[12.5px] text-[var(--ax-fg-faint)] leading-snug">У группы нет публичной ссылки — найди её в Telegram по названию.</span>
          )}
          <button
            type="button"
            onClick={() => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="shrink-0 inline-flex items-center gap-1.5 h-11 px-3 rounded-lg text-[13px] border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-fg)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          >
            <ArrowDown size={15} />
            Переписка
          </button>
        </footer>
      </aside>
    </>
  )
}

// Длинная выжимка сворачивается до нескольких строк: дела (обещания,
// деньги) стоят выше, и до них не надо листать через три экрана текста.
function LongText({ text }: { text: string }) {
  const long = text.length > 420
  const [open, setOpen] = useState(!long)
  return (
    <div className="max-w-[68ch]">
      <p className={`text-[14px] text-[var(--ax-fg-soft)] leading-relaxed whitespace-pre-wrap break-words ${open ? '' : 'line-clamp-5'}`}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="mt-1.5 text-[13px] text-[#4FC08D] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D] rounded"
        >
          {open ? 'Свернуть' : 'Показать полностью'}
        </button>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11.5px] uppercase tracking-wide font-medium text-[var(--ax-fg-faint)]">{title}</h3>
      {children}
    </section>
  )
}

// Открытые сверху, «неясно» за ними, выполненные — в конце.
function sortPromises(list: CrmPromise[]): CrmPromise[] {
  const rank = (p: CrmPromise) => (p.done === false ? 0 : p.done == null ? 1 : 2)
  return [...list].sort((a, b) => rank(a) - rank(b))
}

function PromiseList({ items }: { items: CrmPromise[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((p, i) => {
        const done = p.done === true
        return (
          <li key={i} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={`shrink-0 mt-[7px] w-2 h-2 rounded-full ${done ? 'bg-[var(--ax-fg-faint)]' : p.done == null ? 'border border-[var(--ax-prospect-maybe-fg)]' : 'bg-[var(--ax-prospect-maybe-fg)]'}`}
            />
            <div className="min-w-0 flex-1">
              <span className={`text-[14px] leading-relaxed break-words ${done ? 'line-through text-[var(--ax-fg-faint)]' : 'text-[var(--ax-fg)]'}`}>{p.text}</span>
              <span className="ml-2 text-[11.5px] text-[var(--ax-fg-faint)] whitespace-nowrap">
                {[fmtDate(p.date), done ? 'сделано' : p.done == null ? 'неясно' : null].filter(Boolean).join(' · ')}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

type LoadState = 'loading' | 'ready' | 'missing' | 'error'

// Переписка грузится с конца страницами: последние 200 сообщений сразу,
// раньше — по кнопке. Чат на 30 тыс. сообщений целиком браузер рисовал бы
// секундами, а читают в нём почти всегда последние дни.
function Transcript({ chatId, isGroup, scrollRef, anchorRef }: {
  chatId: number
  isGroup: boolean
  scrollRef: React.RefObject<HTMLElement | null>
  anchorRef: React.RefObject<HTMLElement | null>
}) {
  const [state, setState] = useState<LoadState>('loading')
  const [messages, setMessages] = useState<CrmMessage[]>([])
  const [start, setStart] = useState(0)
  const [total, setTotal] = useState(0)
  const [more, setMore] = useState(false)
  const [moreError, setMoreError] = useState(false)

  const fetchPage = useCallback(async (before: number | null, limit: number): Promise<TranscriptPage | 'missing'> => {
    const qs = new URLSearchParams({ limit: String(limit) })
    if (before != null) qs.set('before', String(before))
    const r = await fetch(`/api/admin/crm/${chatId}?${qs}`, { cache: 'no-store' })
    if (r.status === 401 || r.status === 403) { window.location.href = '/admin'; throw new Error('auth') }
    if (r.status === 404) return 'missing'
    const j = await r.json() as TranscriptPage | { ok: false }
    if (!r.ok || !j.ok) throw new Error('load_failed')
    return j
  }, [chatId])

  const loadFirst = useCallback(async () => {
    setState('loading')
    try {
      const page = await fetchPage(null, FIRST_PAGE)
      if (page === 'missing') { setState('missing'); return }
      setMessages(page.messages); setStart(page.start); setTotal(page.total)
      setState(page.total === 0 ? 'missing' : 'ready')
    } catch {
      setState('error')
    }
  }, [fetchPage])

  useEffect(() => { loadFirst() }, [loadFirst])

  // Подгружаем более ранние и держим экран на месте: без поправки
  // прокрутки новые сообщения сверху сдвинули бы читаемое вниз.
  const loadEarlier = async () => {
    setMore(true); setMoreError(false)
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    try {
      const page = await fetchPage(start, MORE_PAGE)
      if (page === 'missing') return
      setMessages(prev => [...page.messages, ...prev])
      setStart(page.start)
      requestAnimationFrame(() => { if (el) el.scrollTop += el.scrollHeight - prevHeight })
    } catch {
      setMoreError(true)
    } finally {
      setMore(false)
    }
  }

  return (
    <section ref={anchorRef} className="scroll-mt-24">
      <h3 className="mb-3 text-[11.5px] uppercase tracking-wide font-medium text-[var(--ax-fg-faint)]">
        Переписка{total > 0 ? ` · ${total.toLocaleString('ru-RU')}` : ''}
      </h3>

      {state === 'loading' && (
        <div className="flex items-center gap-2 py-8 justify-center text-[13px] text-[var(--ax-fg-muted)]" aria-busy="true">
          <Loader2 size={15} className="animate-spin" /> Загружаю переписку…
        </div>
      )}
      {state === 'missing' && (
        <p className="py-8 text-center text-[13px] text-[var(--ax-fg-muted)]">Переписка этого чата ещё не выгружена.</p>
      )}
      {state === 'error' && (
        <div className="py-6 flex flex-col items-center gap-3">
          <p className="text-[13px] text-[var(--ax-error-fg)]">Переписка не загрузилась.</p>
          <button
            type="button"
            onClick={loadFirst}
            className="h-9 px-4 rounded-lg text-[13px] border border-[var(--ax-border)] text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
          >
            Попробовать ещё раз
          </button>
        </div>
      )}

      {state === 'ready' && (
        <div className="rounded-xl bg-[var(--ax-chat-bg)] px-3 py-3 md:px-4 flex flex-col gap-2">
          {start > 0 && (
            <div className="flex flex-col items-center gap-1.5 pb-2">
              <button
                type="button"
                onClick={loadEarlier}
                disabled={more}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-fg)] disabled:opacity-60 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
              >
                {more ? <Loader2 size={14} className="animate-spin" /> : <ChevronUp size={14} />}
                Показать раньше · ещё {start.toLocaleString('ru-RU')}
              </button>
              {moreError && <span className="text-[12px] text-[var(--ax-error-fg)]">Не загрузилось — нажми ещё раз</span>}
            </div>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const day = dayKey(m.d)
            const newDay = !prev || dayKey(prev.d) !== day
            const showSender = isGroup && m.o === 0 && (newDay || prev?.s !== m.s || prev?.o !== 0)
            return (
              <div key={start + i} className="flex flex-col gap-2">
                {newDay && (
                  <div className="self-center mt-2 px-2.5 py-0.5 rounded-full text-[11.5px] text-[var(--ax-fg-muted)] bg-[var(--ax-hover)]">{dayLabel(m.d)}</div>
                )}
                <Bubble m={m} showSender={showSender} />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
function dayLabel(iso: string): string {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('ru-RU', sameYear ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' })
}

function Bubble({ m, showSender }: { m: CrmMessage; showSender: boolean }) {
  const out = m.o === 1
  const media = m.m ? (MEDIA[m.m] ?? { label: 'вложение', Icon: Paperclip }) : null
  const text = m.t?.trim()
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${out ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--ax-bubble-user-bg)] text-[var(--ax-bubble-user-fg)]'}`}>
        {showSender && m.s && <div className="text-[12px] font-medium opacity-70 mb-0.5 break-words">{m.s}</div>}
        {media && (
          <div className="flex items-center gap-1.5 text-[12.5px] opacity-75 min-w-0">
            <media.Icon size={13} className="shrink-0" />
            <span className="shrink-0">{media.label}</span>
            {m.f && <span className="truncate">· {m.f}</span>}
          </div>
        )}
        {text && <div className={`whitespace-pre-wrap break-words ${media ? 'mt-0.5' : ''}`}><Linkified text={text} /></div>}
        {!text && !media && <span className="text-[12px] italic opacity-60">пустое сообщение</span>}
        <div className={`text-[11.5px] mt-0.5 text-right ${out ? 'text-white/70' : 'opacity-50'}`}>
          {new Date(m.d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
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
