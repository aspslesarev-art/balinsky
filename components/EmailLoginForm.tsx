'use client'

// Вход по почте: адрес → шестизначный код из письма → перезагрузка страницы
// (вход ставит куку bx_auth, а гейт читает её до первой отрисовки).
//
// Challenge выпускается по действию, не на рендере: форма живёт внутри
// ISR-страниц, общих для всех посетителей.

import { useEffect, useId, useRef, useState } from 'react'
import type { Lang } from '@/lib/i18n'

const CODE_LENGTH = 6

const COPY = {
  ru: {
    emailLabel: 'Ваша почта',
    emailPlaceholder: 'name@example.com',
    send: 'Получить код',
    sending: 'Отправляем…',
    sent: (email: string) => `Мы отправили код на ${email}. Введите его здесь.`,
    codeLabel: 'Код из письма',
    verify: 'Войти',
    checking: 'Проверяем…',
    resend: 'Прислать новый код',
    other: 'Другая почта',
    ttl: 'Код действует 15 минут. Письма нет — проверьте «Спам».',
    privacy: 'Без пароля — пришлём код из шести цифр. Почту используем только для входа.',
    network: 'Нет связи. Попробуйте ещё раз.',
  },
  en: {
    emailLabel: 'Your email',
    emailPlaceholder: 'name@example.com',
    send: 'Get a code',
    sending: 'Sending…',
    sent: (email: string) => `We sent a code to ${email}. Enter it here.`,
    codeLabel: 'Code from the email',
    verify: 'Sign in',
    checking: 'Checking…',
    resend: 'Send a new code',
    other: 'Use another email',
    ttl: 'The code is valid for 15 minutes. No email? Check your spam folder.',
    privacy: 'No password — we email you a six-digit code. Your email is used only to sign you in.',
    network: 'Connection problem. Please try again.',
  },
} as const

export function EmailLoginForm({ ctaLabel, lang = 'ru' }: { ctaLabel?: string; lang?: Lang }) {
  const l = lang === 'ru' ? 'ru' : 'en'
  const c = COPY[l]
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement | null>(null)
  // Several gates can share a page — ids must be unique per form.
  const uid = useId()

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus()
  }, [step])

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, path: window.location.pathname + window.location.search, lang: l }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) {
        setError(j.error ?? c.network)
        return
      }
      setCode('')
      setStep('code')
    } catch {
      setError(c.network)
    } finally {
      setBusy(false)
    }
  }

  async function verify(value: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value, lang: l }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) {
        setError(j.error ?? c.network)
        return
      }
      window.location.reload()
    } catch {
      setError(c.network)
    } finally {
      setBusy(false)
    }
  }

  function onCodeChange(raw: string) {
    const v = raw.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(v)
    if (v.length === CODE_LENGTH) void verify(v)
  }

  const input = 'w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 disabled:opacity-60'
  const button = 'inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60'

  if (step === 'email') {
    return (
      <form onSubmit={requestCode} className="mt-4 max-w-sm">
        <label className="block text-[13px] text-[var(--color-text-muted)] mb-1.5" htmlFor={`${uid}-email`}>{c.emailLabel}</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`${uid}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            disabled={busy}
            onChange={e => setEmail(e.target.value)}
            placeholder={c.emailPlaceholder}
            className={input}
          />
          <button type="submit" disabled={busy || !email} className={`${button} shrink-0`}>
            {busy ? c.sending : (ctaLabel ?? c.send)}
          </button>
        </div>
        {error && <p className="mt-2 text-[13px] text-red-600" role="alert">{error}</p>}
        <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">{c.privacy}</p>
      </form>
    )
  }

  return (
    <div className="mt-4 max-w-sm">
      <p className="text-[14px] text-[#374151]">{c.sent(email)}</p>
      <label className="sr-only" htmlFor={`${uid}-code`}>{c.codeLabel}</label>
      <div className="mt-3 flex items-center gap-2">
        <input
          id={`${uid}-code`}
          ref={codeRef}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          value={code}
          disabled={busy}
          onChange={e => onCodeChange(e.target.value)}
          placeholder="000000"
          className={`${input} w-44 text-center text-[22px] font-semibold tracking-[0.3em]`}
        />
        <button type="button" onClick={() => verify(code)} disabled={busy || code.length !== CODE_LENGTH} className={button}>
          {busy ? c.checking : c.verify}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] text-red-600" role="alert">{error}</p>}
      <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">{c.ttl}</p>
      <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
        <button type="button" onClick={() => requestCode()} disabled={busy} className="underline hover:no-underline">{c.resend}</button>
        {' · '}
        <button type="button" onClick={() => { setStep('email'); setError(null) }} className="underline hover:no-underline">{c.other}</button>
      </p>
    </div>
  )
}
