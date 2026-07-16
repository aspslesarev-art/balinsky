'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Lock, Loader2, X, CheckCircle2, Calendar, FileText, Wallet, Undo2, ChevronRight } from 'lucide-react'
import { switchLangPath, type Lang, detectLang, pickCopy } from '@/lib/i18n'

const COPY = {
  ru: {
    cta: 'Зарезервировать',
    titleOpen: 'Зарезервировать объект',
    titleDone: 'Бронь принята',
    close: 'Закрыть',
    submitted: 'Заявка отправлена менеджеру',
    explainer: (email: string) => (
      <>В течение часа мы пришлём на <strong className="text-[#111827] break-all">{email}</strong> счёт для оплаты резервационного депозита. Объект забронирован за вами на 14 дней. Паспортные данные пришлёте ответом на тот же email.</>
    ),
    ok: 'Понятно',
    intro: 'Объект встанет на 14-дневный hold. Менеджер пришлёт счёт на оплату депозита на указанный email.',
    name: 'Имя и фамилия', namePh: 'Иван Петров',
    email: 'Email', emailPh: 'ivan@example.com',
    phone: 'Телефон', phonePh: '+7 999 123-45-67',
    consent: 'Согласен с обработкой персональных данных и условиями резервационного депозита.',
    failed: 'Не получилось отправить. Попробуйте ещё раз.',
    sending: 'Отправляем…',
    trustHold: '14-дневный эксклюзивный hold — никто другой не сможет купить в это окно.',
    trustForm: 'Reservation form — короткая бумага, не SPA. Сделку у нотариуса PPAT подписываем позже, после due diligence.',
    trustDeposit: 'Депозит ($2–10k) идёт на счёт нотариуса или эскроу — не на личный счёт менеджера.',
    trustRefund: 'Если в 14 дней вы откажетесь по результатам DD — депозит возвращается полностью.',
    trustMore: 'Подробнее о бронировании',
  },
  en: {
    cta: 'Reserve',
    titleOpen: 'Reserve this property',
    titleDone: 'Reservation received',
    close: 'Close',
    submitted: 'Sent to the manager',
    explainer: (email: string) => (
      <>We will email <strong className="text-[#111827] break-all">{email}</strong> within an hour with an invoice for the reservation deposit. The property is held for you for 14 days. Send your passport details in reply to the same email.</>
    ),
    ok: 'Got it',
    intro: 'The property goes on a 14-day hold. The manager will email an invoice for the deposit to the address you provide.',
    name: 'Full name', namePh: 'John Smith',
    email: 'Email', emailPh: 'john@example.com',
    phone: 'Phone', phonePh: '+1 555 123 45 67',
    consent: 'I agree to the processing of personal data and reservation deposit terms.',
    failed: 'Could not send. Please try again.',
    sending: 'Sending…',
    trustHold: '14-day exclusive hold — no one else can complete a purchase in that window.',
    trustForm: 'Reservation form is a short document, not the SPA. The SPA is signed later before a PPAT notary, after due diligence.',
    trustDeposit: 'Deposit ($2–10k) sits with the notary escrow — never on a personal account.',
    trustRefund: 'If you walk inside 14 days based on DD findings — full refund.',
    trustMore: 'Read the full reservation policy',
  },
} as const

// Stage-1 reservation flow: visitor leaves name + email + phone. Backend
// records the row and pings the operator on Telegram. The operator then
// emails the invoice manually; payment + passport docs come back through
// that email thread (handled outside this UI).
export function ReserveButton({
  listingKind,
  listingId,
  listingSlug,
  listingTitle,
  listingPriceUsd = null,
  className = '',
}: {
  listingKind: 'villa' | 'apartment'
  listingId: string
  listingSlug: string
  listingTitle: string | null
  listingPriceUsd?: number | null
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const pathname = usePathname() ?? ''
  const lang: Lang = detectLang(pathname)
  const c = pickCopy(COPY, lang)

  const canSubmit = name.trim().length > 0
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    && phone.trim().length >= 6
    && agree
    && !busy

  // Esc closes — kept consistent with the presentation modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy])

  // Prevent the page from scrolling under the modal — important on mobile
  // where pinching/scrolling the body while the keyboard is open is a mess.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_kind: listingKind,
          listing_id: listingId,
          listing_slug: listingSlug,
          listing_title: listingTitle,
          listing_price_usd: listingPriceUsd,
          contact_name: name.trim(),
          contact_email: email.trim(),
          contact_phone: phone.trim(),
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) throw new Error(j?.error ?? 'server_error')
      setDone(true)
    } catch (e) {
      console.error('[reserve] failed', e)
      setError(c.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setDone(false); setOpen(true) }}
        className={`inline-flex w-full md:w-auto items-center justify-center gap-2 min-h-[54px] py-2 px-6 rounded-[10px] bg-white border border-[var(--color-border)] hover:border-[var(--color-text-muted)] text-[#1A1F1C] text-[15px] md:text-[16px] font-semibold text-center leading-tight transition-colors ${className}`}
      >
        <Lock size={18} strokeWidth={1.6} /> {c.cta}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 sm:px-4 overscroll-contain"
          onClick={() => { if (!busy) setOpen(false) }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full sm:max-w-md bg-white shadow-xl flex flex-col rounded-t-3xl sm:rounded-3xl
                       max-h-[92vh] sm:max-h-[88vh] pb-[max(env(safe-area-inset-bottom),0.5rem)]
                       animate-[reserveSlide_220ms_ease-out]"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag-handle hint on mobile so the bottom-sheet feels native */}
            <div className="sm:hidden mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-black/10" />

            <div className="flex items-start justify-between gap-3 px-5 sm:px-7 pt-3 sm:pt-7 pb-2">
              <h3 className="text-[19px] sm:text-[22px] font-semibold tracking-tight text-[#111827] leading-tight">
                {done ? c.titleDone : c.titleOpen}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 text-[#111827] disabled:opacity-50"
                aria-label={c.close}
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 sm:px-7 pb-5 sm:pb-7">
              {done ? (
                <div>
                  <div className="flex items-center gap-2 text-[var(--color-primary-pressed)] mb-3">
                    <CheckCircle2 size={20} />
                    <span className="text-[15px] font-medium">{c.submitted}</span>
                  </div>
                  <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed mb-5">
                    {c.explainer(email.trim())}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-medium h-12 transition-colors"
                  >
                    {c.ok}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed mb-4">
                    {c.intro}
                  </p>

                  {/* Trust strip — four bullets that close the gap a foreign
                      investor opens up between "I tap reserve" and "I send
                      money". Compact icons + one short line each. */}
                  <ul className="rounded-xl bg-[var(--color-search-bg)] p-3 space-y-2 mb-4">
                    {[
                      { Icon: Calendar, t: c.trustHold },
                      { Icon: FileText, t: c.trustForm },
                      { Icon: Wallet,   t: c.trustDeposit },
                      { Icon: Undo2,    t: c.trustRefund },
                    ].map(({ Icon, t }, i) => (
                      <li key={i} className="flex gap-2 items-start text-[12px] leading-snug text-[var(--color-text)]">
                        <Icon size={13} strokeWidth={1.8} className="text-[var(--color-primary)] shrink-0 mt-[2px]" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={switchLangPath('/ru/rezervirovanie', lang)}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[12px] text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)] mb-5 no-underline"
                  >
                    {c.trustMore} <ChevronRight size={12} />
                  </Link>

                  <form
                    onSubmit={e => { e.preventDefault(); submit() }}
                    className="space-y-3.5"
                  >
                    <Field id="rsv-name" label={c.name} value={name} onChange={setName} placeholder={c.namePh} autoComplete="name" required />
                    <Field id="rsv-email" label={c.email} value={email} onChange={setEmail} placeholder={c.emailPh} inputMode="email" autoComplete="email" required />
                    <Field id="rsv-phone" label={c.phone} value={phone} onChange={setPhone} placeholder={c.phonePh} inputMode="tel" autoComplete="tel" required />
                    <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={e => setAgree(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[var(--color-primary)] shrink-0"
                      />
                      <span className="text-[12px] text-[var(--color-text-muted)] leading-snug">
                        {c.consent}
                      </span>
                    </label>
                    {error && <p className="text-[13px] text-[#B91C1C]">{error}</p>}
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-semibold h-12 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {c.sending}
                        </>
                      ) : (
                        c.cta
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

        </div>
      )}
    </>
  )
}

function Field({
  id, label, value, onChange, placeholder, required, inputMode, autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  inputMode?: 'text' | 'tel' | 'email'
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        autoComplete={autoComplete}
        // 16px font-size suppresses iOS Safari's auto-zoom on focus.
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 h-12 text-[16px] text-[#111827] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-colors"
      />
    </div>
  )
}
