'use client'

// Окошко «Имя + контакт» перед переходом в Telegram / WhatsApp менеджера
// застройщика. Заявка уходит через /api/contact (админ-чат + чат
// застройщика, если привязан), сам чат открывается сразу по нажатию —
// в том же жесте пользователя, иначе браузер заблокирует новое окно.
//
// Имя и контакт запоминаются в браузере: второй раз поля уже заполнены.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, MessageCircle } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

export type LeadChannel = 'telegram' | 'whatsapp'

// Тексты пока RU + EN; остальные языки берут EN (pickCopy) до согласования.
const COPY = {
  ru: {
    title: (dev: string | null) => dev ? `Связаться с ${dev}` : 'Связаться с застройщиком',
    lead: 'Оставьте имя и контакт - менеджер будет знать, кто пишет, и сможет ответить, если чат не откроется.',
    name: 'Имя',
    namePh: 'Как к вам обращаться',
    phone: 'Номер WhatsApp',
    tg: 'Номер или ник в Telegram',
    tgPh: '+62 812 3456 7890 или @username',
    submit: (ch: LeadChannel) => ch === 'telegram' ? 'Перейти в Telegram' : 'Перейти в WhatsApp',
    note: 'Контакт получит только менеджер застройщика. Balinsky в переговорах и сделке не участвует.',
    close: 'Закрыть',
    errName: 'Напишите имя',
    errPhone: 'Нужен номер с кодом страны, например +62…',
    errTg: 'Нужен номер с кодом страны или ник вида @username',
  },
  en: {
    title: (dev: string | null) => dev ? `Contact ${dev}` : 'Contact the developer',
    lead: 'Leave your name and contact so the manager knows who is writing and can reach you if the chat doesn’t open.',
    name: 'Name',
    namePh: 'Your name',
    phone: 'WhatsApp number',
    tg: 'Telegram number or username',
    tgPh: '+62 812 3456 7890 or @username',
    submit: (ch: LeadChannel) => ch === 'telegram' ? 'Continue to Telegram' : 'Continue to WhatsApp',
    note: 'Only the developer’s manager receives your contact. Balinsky takes no part in the talks or the transaction.',
    close: 'Close',
    errName: 'Please enter your name',
    errPhone: 'Enter a number with country code, e.g. +62…',
    errTg: 'Enter a number with country code or a @username',
  },
} as const

const STORE_KEY = 'bx_lead_contact'

// Телефон: 8–15 цифр (E.164), допускаем пробелы, скобки, дефисы, ведущий +.
function isPhone(s: string): boolean {
  if (!/^\+?[\d\s()\-.]+$/.test(s)) return false
  const digits = s.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

// Ник Telegram: 5–32 символа, буквы/цифры/подчёркивание, начинается с буквы.
// Принимаем и ссылку t.me/username.
function tgHandle(s: string): string | null {
  const m = s.trim().match(/^(?:@|(?:https?:\/\/)?t\.me\/)?([a-zA-Z][a-zA-Z0-9_]{4,31})$/)
  return m ? `@${m[1]}` : null
}

export function ContactLeadDialog({
  open,
  onClose,
  channel,
  targetUrl,
  lang,
  developerName,
  managerName,
  listingTitle,
}: {
  open: boolean
  onClose: () => void
  channel: LeadChannel
  targetUrl: string
  lang: Lang
  developerName: string | null
  managerName: string
  listingTitle?: string | null
}) {
  const c = pickCopy(COPY, lang)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as
        { name?: string; phone?: string; telegram?: string } | null
      if (saved) {
        setName(saved.name ?? '')
        setContact((channel === 'telegram' ? saved.telegram || saved.phone : saved.phone) ?? '')
      }
    } catch { /* приватный режим — просто пустые поля */ }
    const t = setTimeout(() => nameRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, channel, onClose])

  if (!open || typeof document === 'undefined') return null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const raw = contact.trim()
    if (!n) { setError(c.errName); return }
    let phone = ''
    let telegram = ''
    if (channel === 'whatsapp') {
      if (!isPhone(raw)) { setError(c.errPhone); return }
      phone = raw
    } else if (isPhone(raw)) {
      phone = raw
    } else {
      const h = tgHandle(raw)
      if (!h) { setError(c.errTg); return }
      telegram = h
    }

    try {
      const prev = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Record<string, string>
      localStorage.setItem(STORE_KEY, JSON.stringify({
        ...prev,
        name: n,
        ...(phone ? { phone } : {}),
        ...(telegram ? { telegram } : {}),
      }))
    } catch { /* не критично */ }

    // keepalive — запрос доживёт, даже если вкладка уйдёт в мессенджер.
    void fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        name: n,
        phone: phone || undefined,
        telegram: telegram || undefined,
        channel,
        managerName,
        developerName: developerName ?? undefined,
        listingTitle: listingTitle ?? undefined,
        website,
        page: 'manager-card',
        pagePath: window.location.pathname,
      }),
    }).catch(err => console.error('[lead] send failed', err))

    window.open(targetUrl, '_blank', 'noopener')
    onClose()
  }

  const Icon = channel === 'telegram' ? Send : MessageCircle
  const inputCls = 'w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-white text-[16px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 transition-[border-color,box-shadow] duration-[120ms]'

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-dialog-title"
        className="relative w-full sm:max-w-[440px] rounded-t-2xl sm:rounded-2xl bg-white p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-[0_1px_2px_rgb(0_0_0/.04),0_12px_32px_rgb(0_0_0/.12)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={c.close}
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-search-bg)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] transition-colors"
        >
          <X size={18} />
        </button>
        <h2 id="lead-dialog-title" className="pr-10 text-[20px] font-semibold tracking-tight leading-[1.2] text-[var(--color-text)]">
          {c.title(developerName)}
        </h2>
        <p className="mt-2 text-[14px] leading-[1.55] text-[var(--color-text-muted)]">{c.lead}</p>

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-[14px] font-medium text-[var(--color-text)]">{c.name}</span>
            <input
              ref={nameRef}
              className={inputCls}
              value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
              placeholder={c.namePh}
              autoComplete="name"
              maxLength={100}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[14px] font-medium text-[var(--color-text)]">
              {channel === 'telegram' ? c.tg : c.phone}
            </span>
            <input
              className={inputCls}
              value={contact}
              onChange={e => { setContact(e.target.value); setError(null) }}
              placeholder={channel === 'telegram' ? c.tgPh : '+62 812 3456 7890'}
              type={channel === 'whatsapp' ? 'tel' : 'text'}
              inputMode={channel === 'whatsapp' ? 'tel' : 'text'}
              autoComplete={channel === 'whatsapp' ? 'tel' : 'off'}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={40}
            />
          </label>
          {/* honeypot */}
          <input
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
            name="website"
          />
          {error && <p role="alert" className="text-[14px] text-[#B42318]">{error}</p>}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 h-12 px-5 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] active:scale-[.98] text-white text-[16px] font-medium transition-[background-color,transform] duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <Icon size={18} strokeWidth={1.6} /> {c.submit(channel)}
          </button>
          <p className="text-[13px] leading-[1.55] text-[var(--color-text-muted)]">{c.note}</p>
        </form>
      </div>
    </div>,
    document.body,
  )
}
