'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { PRO_COPY, legalLinks } from './copy'
import { ProBackdrop } from './ProBackdrop'

// Окно входа в Balinsky Pro поверх размытой панели аналитики — вариант A
// из макета, «как у AirDNA» (владелец 21.10.2026). Пути: Telegram (бот шлёт
// ссылку и 4 цифры) и код на почту — паролей нет. Google временно скрыт
// (GOOGLE_ENABLED): в Google Cloud ещё не добавлен адрес возврата. «Войти» и «Создать аккаунт» — один и тот же
// вход, переключатель меняет только заголовок, как у AirDNA.
// После входа возвращаем туда, откуда пришли (?next), иначе в каталог вилл.

const CODE_LENGTH = 6
const TG_CODE_LENGTH = 4
const GOOGLE_ENABLED = false

function TelegramMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path fill="#fff" d="M5.4 11.7l11.1-4.3c.5-.2 1 .1.8.9l-1.9 8.9c-.1.6-.5.8-1 .5l-2.9-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-2.9 5.4-4.9c.2-.2 0-.3-.4-.1l-6.6 4.2-2.8-.9c-.6-.2-.6-.6.1-.9z" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
const BTN = `flex h-14 w-full items-center justify-center gap-3 rounded-full border border-[#D5DBD8] bg-white px-4 text-[16px] md:text-[17px] font-medium text-[var(--color-text)] no-underline transition-colors duration-[120ms] hover:bg-[var(--color-search-bg)] disabled:opacity-50 cursor-pointer ${FOCUS}`
const PRIMARY = `flex h-14 w-full items-center justify-center rounded-full bg-[var(--color-primary)] text-[16px] md:text-[17px] font-medium text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] disabled:opacity-50 cursor-pointer ${FOCUS}`
const INPUT = 'h-14 w-full rounded-2xl border border-[#D5DBD8] bg-white px-4 text-[16px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]'
const LINK = 'underline underline-offset-[3px] hover:text-[var(--color-text)]'

export function ProSignIn({ lang, next, browseHref, error, user }: {
  lang: Lang
  next: string | null
  /** Каталог вилл на языке посетителя — куда вести без ?next. */
  browseHref: string
  error: 'google' | null
  user: { name: string | null } | null
}) {
  const t = PRO_COPY[lang]
  const legal = legalLinks(lang)
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [step, setStep] = useState<'choose' | 'email' | 'code' | 'tg'>('choose')
  const [tgUrl, setTgUrl] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(error === 'google' ? t.googleFailed : null)
  const after = next ?? browseHref
  const googleHref = `/api/auth/google?next=${encodeURIComponent(after)}`
  // Письмо с кодом есть только на русском и английском (lib/site-auth.ts).
  const mailLang = lang === 'ru' || lang === 'uk' ? 'ru' : 'en'

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, path: after, lang: mailLang }),
      })
      const d = await r.json().catch(() => null)
      if (d?.ok) setStep('code')
      else setMsg(typeof d?.error === 'string' ? d.error : t.network)
    } catch {
      setMsg(t.network)
    } finally {
      setBusy(false)
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, lang: mailLang }),
      })
      const d = await r.json().catch(() => null)
      if (d?.ok) { window.location.href = after; return }
      setMsg(typeof d?.error === 'string' ? d.error : t.network)
    } catch {
      setMsg(t.network)
    } finally {
      setBusy(false)
    }
  }

  // Вход через Telegram: тот же /api/auth/start, что у кабинета. Бот
  // присылает ссылку (вернёт на `after` уже со входом) и 4 цифры — их можно
  // ввести здесь, если ссылка открылась в другом браузере.
  async function startTelegram() {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: after }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.url) throw new Error('start')
      setTgUrl(d.url)
      setStep('tg')
      setCode('')
      // Телефон — той же вкладкой (вторую перехватывает приложение Telegram),
      // компьютер — новой; заблокировали окно — той же.
      const touch = window.matchMedia('(pointer: coarse)').matches
      if (touch || !window.open(d.url, '_blank')) window.location.href = d.url
    } catch {
      setMsg(t.tgFailed)
    } finally {
      setBusy(false)
    }
  }

  async function verifyTelegram(value: string) {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: value, lang: mailLang }),
      })
      const d = await r.json().catch(() => null)
      if (d?.ok) { window.location.href = after; return }
      setMsg(typeof d?.error === 'string' ? d.error : t.network)
      setCode('')
    } catch {
      setMsg(t.network)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F3F5F4]">
      <ProBackdrop />
      <div aria-hidden className="absolute inset-0 bg-[rgb(28_38_34/0.30)]" />

      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[540px] overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgb(0_0_0/.06),0_32px_80px_rgb(15_26_21/.30)]">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--color-border)] px-6 py-5 md:px-8">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.svg" alt="Balinsky" width={36} height={36} className="h-9 w-9" />
              <span className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">Balinsky</span>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[12px] font-semibold tracking-wide text-[var(--color-primary-pressed)]">PRO</span>
            </div>
            {!user && (
              <span className="text-[15px] text-[var(--color-text-muted)]">
                {mode === 'signup' ? t.haveAccount : t.newHere}{' '}
                <button type="button" onClick={() => setMode(m => (m === 'signup' ? 'login' : 'signup'))}
                  className={`font-semibold text-[var(--color-text)] underline underline-offset-[3px] hover:text-[var(--color-primary)] cursor-pointer ${FOCUS}`}>
                  {mode === 'signup' ? t.logIn : t.signUp}
                </button>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-7 px-6 pb-9 pt-10 md:px-10 md:pt-11">
            {user ? (
              <>
                <div className="flex flex-col gap-3 text-center">
                  <h1 className="text-[28px] md:text-[34px] font-semibold leading-tight tracking-tight text-[var(--color-text)]">
                    {user.name ? `${t.inTitle}, ${user.name}` : t.inTitle}
                  </h1>
                  <p className="text-[16px] md:text-[17px] leading-relaxed text-[var(--color-text-muted)]">{t.inLead}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href={after} className={PRIMARY}>{next ? t.continue : t.browse}</Link>
                  <form action="/api/auth/logout" method="post">
                    <button type="submit" className={BTN}>{t.signOut}</button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 text-center">
                  <h1 className="text-[28px] md:text-[34px] font-semibold leading-tight tracking-tight text-[var(--color-text)]">
                    {mode === 'signup' ? t.titleSignup : t.titleLogin}
                  </h1>
                  <p className="text-[16px] md:text-[17px] leading-relaxed text-[var(--color-text-muted)]">{t.lead}</p>
                </div>

                <div className="flex flex-col gap-3">
                  {step === 'choose' && (
                    <>
                      {GOOGLE_ENABLED && <a href={googleHref} className={BTN}><GoogleMark />{t.google}</a>}
                      <button type="button" onClick={startTelegram} disabled={busy} className={BTN}><TelegramMark />{busy ? t.tgOpening : t.telegram}</button>
                      <button type="button" onClick={() => { setStep('email'); setMsg(null) }} className={BTN}>
                        <Mail size={22} strokeWidth={1.75} aria-hidden />{t.email}
                      </button>
                    </>
                  )}

                  {step === 'email' && (
                    <form onSubmit={sendCode} className="flex flex-col gap-3">
                      <label className="sr-only" htmlFor="pro-email">{t.emailLabel}</label>
                      <input id="pro-email" type="email" required autoFocus autoComplete="email" inputMode="email"
                        placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} />
                      <button type="submit" disabled={busy || !email} className={PRIMARY}>{busy ? t.sending : t.send}</button>
                      {GOOGLE_ENABLED
                        ? <a href={googleHref} className={BTN}><GoogleMark />{t.google}</a>
                        : <button type="button" onClick={startTelegram} disabled={busy} className={BTN}><TelegramMark />{t.telegram}</button>}
                    </form>
                  )}

                  {step === 'tg' && (
                    <div className="flex flex-col gap-3">
                      <p className="text-center text-[15px] leading-relaxed text-[var(--color-text-muted)]">{t.tgSent}</p>
                      <label className="sr-only" htmlFor="pro-tg-code">{t.codeLabel}</label>
                      <input id="pro-tg-code" autoFocus autoComplete="one-time-code" inputMode="numeric"
                        maxLength={TG_CODE_LENGTH} placeholder="••••" value={code} disabled={busy}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, TG_CODE_LENGTH)
                          setCode(v)
                          if (v.length === TG_CODE_LENGTH) void verifyTelegram(v)
                        }}
                        className={`${INPUT} text-center text-[22px] tracking-[0.4em]`} />
                      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[15px] text-[var(--color-text-muted)]">
                        {tgUrl && <a href={tgUrl} rel="noreferrer" className={LINK}>{t.tgOpen}</a>}
                        <button type="button" onClick={startTelegram} disabled={busy} className={`${LINK} cursor-pointer`}>{t.tgResend}</button>
                      </div>
                    </div>
                  )}

                  {step === 'code' && (
                    <form onSubmit={verify} className="flex flex-col gap-3">
                      <p className="text-center text-[15px] text-[var(--color-text-muted)]">{t.sent(email)}</p>
                      <label className="sr-only" htmlFor="pro-code">{t.codeLabel}</label>
                      <input id="pro-code" required autoFocus autoComplete="one-time-code" inputMode="numeric"
                        maxLength={CODE_LENGTH} placeholder="••••••" value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                        className={`${INPUT} text-center text-[22px] tracking-[0.4em]`} />
                      <button type="submit" disabled={busy || code.length !== CODE_LENGTH} className={PRIMARY}>{busy ? t.checking : t.verify}</button>
                      <button type="button" onClick={() => { setStep('email'); setCode(''); setMsg(null) }}
                        className={`text-[15px] text-[var(--color-text-muted)] ${LINK} cursor-pointer`}>
                        {t.other}
                      </button>
                    </form>
                  )}

                  {msg && <p role="alert" className="text-center text-[15px] text-[#A1281C]">{msg}</p>}
                </div>

                <p className="text-center text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                  {t.legalA} <Link href={legal.terms} className={LINK}>{t.terms}</Link> {t.legalB}{' '}
                  <Link href={legal.privacy} className={LINK}>{t.privacy}</Link>.
                </p>
              </>
            )}
          </div>
        </div>

        <Link href={next ?? browseHref} className={`mt-6 inline-flex items-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-[15px] font-medium text-[var(--color-text)] no-underline hover:bg-white ${FOCUS}`}>
          <ArrowLeft size={16} aria-hidden />{t.back}
        </Link>
      </div>
    </main>
  )
}
