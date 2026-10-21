'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'

// Окно входа в Balinsky Pro поверх размытой аналитики виллы (как у AirDNA,
// владелец 21.10.2026). Два пути: Google и код на почту — паролей нет.
// После входа возвращаем туда, откуда пришли (?next), иначе в каталог вилл.

const CODE_LENGTH = 6

const T = {
  title: 'Unlock Balinsky Pro',
  lead: 'Free account. Yield, demand, safety and real neighbour rates for every villa and apartment in Bali.',
  google: 'Continue with Google',
  email: 'Continue with Email',
  emailLabel: 'Your email',
  send: 'Send code',
  sending: 'Sending…',
  sent: (e: string) => `We sent a 6-digit code to ${e}.`,
  codeLabel: 'Code from the email',
  verify: 'Sign in',
  checking: 'Checking…',
  other: 'Use another email',
  network: 'No connection. Please try again.',
  googleFailed: 'Google sign-in did not go through. Please try again or use email.',
  legal: 'By continuing, you agree to the',
  terms: 'Terms of Use',
  and: 'and have read the',
  privacy: 'Privacy Policy',
  back: 'Back to listings',
  inTitle: 'You are in',
  inLead: 'Pro analytics is open on every villa and apartment page.',
  browse: 'Browse villas',
  continue: 'Back to the listing',
  signOut: 'Sign out',
} as const

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

const BTN = 'flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--color-border)] bg-white text-[15px] font-medium text-[var(--color-text)] no-underline transition-colors duration-[120ms] hover:bg-[var(--color-search-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50 cursor-pointer'
const PRIMARY = 'flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-primary)] text-[15px] font-medium text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50 cursor-pointer'
const INPUT = 'h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-[15px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]'

export function ProSignIn({ next, error, user }: {
  next: string | null
  error: 'google' | null
  user: { name: string | null } | null
}) {
  const [step, setStep] = useState<'choose' | 'email' | 'code'>('choose')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(error === 'google' ? T.googleFailed : null)
  const after = next ?? '/en/villas'
  const googleHref = `/api/auth/google?next=${encodeURIComponent(after)}`

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, path: after, lang: 'en' }),
      })
      const d = await r.json().catch(() => null)
      if (d?.ok) setStep('code')
      else setMsg(typeof d?.error === 'string' ? d.error : T.network)
    } catch {
      setMsg(T.network)
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
        body: JSON.stringify({ code, lang: 'en' }),
      })
      const d = await r.json().catch(() => null)
      if (d?.ok) { window.location.href = after; return }
      setMsg(typeof d?.error === 'string' ? d.error : T.network)
    } catch {
      setMsg(T.network)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--color-bg)]">
      {/* Фон — снимок раздела «Will there be demand?» виллы Premier Umalas
          (public/pro/bg.jpg): размытый, под светлой зелёной вуалью. */}
      <Image src="/pro/bg.jpg" alt="" fill priority sizes="100vw" className="object-cover object-top scale-105 blur-[6px]" />
      <div aria-hidden className="absolute inset-0 bg-[rgb(226_240_232/0.55)]" />

      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgb(0_0_0/.04),0_12px_40px_rgb(15_26_21/.16)]">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-4">
            <Image src="/logo.svg" alt="Balinsky" width={32} height={32} className="h-8 w-8" />
            <span className="text-[16px] font-semibold tracking-tight text-[var(--color-text)]">Balinsky</span>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[12px] font-semibold tracking-wide text-[var(--color-primary-pressed)]">PRO</span>
          </div>

          <div className="px-6 pb-6 pt-8">
            {user ? (
              <>
                <h1 className="text-center text-[24px] font-semibold leading-tight tracking-tight text-[var(--color-text)]">
                  {user.name ? `${T.inTitle}, ${user.name}` : T.inTitle}
                </h1>
                <p className="mx-auto mt-2 max-w-[34ch] text-center text-[15px] leading-relaxed text-[var(--color-text-muted)]">{T.inLead}</p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link href={after} className={PRIMARY}>{next ? T.continue : T.browse}</Link>
                  <form action="/api/auth/logout" method="post">
                    <button type="submit" className={BTN}>{T.signOut}</button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-center text-[24px] font-semibold leading-tight tracking-tight text-[var(--color-text)]">{T.title}</h1>
                <p className="mx-auto mt-2 max-w-[36ch] text-center text-[15px] leading-relaxed text-[var(--color-text-muted)]">{T.lead}</p>

                <div className="mt-6 flex flex-col gap-3">
                  {step === 'choose' && (
                    <>
                      <a href={googleHref} className={BTN}><GoogleMark />{T.google}</a>
                      <button type="button" onClick={() => { setStep('email'); setMsg(null) }} className={BTN}>
                        <Mail size={18} strokeWidth={1.75} aria-hidden />{T.email}
                      </button>
                    </>
                  )}

                  {step === 'email' && (
                    <form onSubmit={sendCode} className="flex flex-col gap-3">
                      <label className="sr-only" htmlFor="pro-email">{T.emailLabel}</label>
                      <input id="pro-email" type="email" required autoFocus autoComplete="email" inputMode="email"
                        placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} />
                      <button type="submit" disabled={busy || !email} className={PRIMARY}>{busy ? T.sending : T.send}</button>
                      <a href={googleHref} className={BTN}><GoogleMark />{T.google}</a>
                    </form>
                  )}

                  {step === 'code' && (
                    <form onSubmit={verify} className="flex flex-col gap-3">
                      <p className="text-center text-[14px] text-[var(--color-text-muted)]">{T.sent(email)}</p>
                      <label className="sr-only" htmlFor="pro-code">{T.codeLabel}</label>
                      <input id="pro-code" required autoFocus autoComplete="one-time-code" inputMode="numeric"
                        maxLength={CODE_LENGTH} placeholder="••••••" value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                        className={`${INPUT} text-center text-[20px] tracking-[0.4em]`} />
                      <button type="submit" disabled={busy || code.length !== CODE_LENGTH} className={PRIMARY}>{busy ? T.checking : T.verify}</button>
                      <button type="button" onClick={() => { setStep('email'); setCode(''); setMsg(null) }}
                        className="text-[14px] text-[var(--color-text-muted)] underline underline-offset-2 hover:text-[var(--color-text)] cursor-pointer">
                        {T.other}
                      </button>
                    </form>
                  )}

                  {msg && <p role="alert" className="text-center text-[14px] text-[#A1281C]">{msg}</p>}
                </div>

                <p className="mt-6 text-center text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                  {T.legal} <Link href="/en/terms" className="underline underline-offset-2 hover:text-[var(--color-text)]">{T.terms}</Link>{' '}
                  {T.and} <Link href="/en/privacy" className="underline underline-offset-2 hover:text-[var(--color-text)]">{T.privacy}</Link>.
                </p>
              </>
            )}
          </div>
        </div>

        <Link href={next ?? '/en/villas'} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[14px] font-medium text-[var(--color-text)] no-underline hover:bg-white">
          <ArrowLeft size={16} aria-hidden />{T.back}
        </Link>
      </div>
    </main>
  )
}
