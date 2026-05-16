'use client'

// Contact block — Telegram / WhatsApp / Email buttons + inline form.
// Mounted on detail pages (under the price card) and the /kontakty page.
// Falls back to no-JS Telegram link if the inline form fails.

import { useState } from 'react'
import { Send, Mail, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

const WA_PHONE = '628113903630'
const CONTACT_EMAIL = 'asp.slesarev@gmail.com'

const COPY = {
  ru: {
    heading: 'Связаться',
    sub: 'Стандарт ответа — в течение часа в рабочее время.',
    tg: 'Написать в Telegram',
    wa: 'WhatsApp',
    email: 'Email',
    or: 'или оставить заявку',
    name: 'Имя',
    nameP: 'Как к вам обращаться',
    emailP: 'name@example.com',
    phone: 'Телефон',
    phoneP: '+7 999 …',
    msg: 'Сообщение',
    msgP: 'Какой объект интересует или с чем помочь',
    submit: 'Отправить',
    sending: 'Отправляем…',
    success: 'Спасибо, заявка принята. Напишем в течение часа.',
    error: 'Что-то пошло не так. Попробуйте ещё раз или напишите в Telegram.',
    waPrefill: 'Здравствуйте! Хочу узнать подробнее о',
    waPrefillGeneric: 'Здравствуйте! Хочу узнать подробнее о недвижимости на Бали.',
  },
  en: {
    heading: 'Get in touch',
    sub: 'Service standard — reply within an hour during business hours.',
    tg: 'Message on Telegram',
    wa: 'WhatsApp',
    email: 'Email',
    or: 'or leave a request',
    name: 'Name',
    nameP: 'Your name',
    emailP: 'name@example.com',
    phone: 'Phone',
    phoneP: '+1 …',
    msg: 'Message',
    msgP: 'Which property are you interested in, or how can we help',
    submit: 'Send',
    sending: 'Sending…',
    success: 'Thanks — request received. We\'ll be in touch within an hour.',
    error: 'Something went wrong. Try again or message us on Telegram.',
    waPrefill: 'Hi, I\'d like to know more about',
    waPrefillGeneric: 'Hi, I\'d like to know more about Bali real estate.',
  },
} as const

export function ContactBlock({
  lang = 'ru',
  listing,
  variant = 'inline',
}: {
  lang?: Lang
  listing?: { kind: string; slug: string; title: string }
  variant?: 'inline' | 'compact'
}) {
  const c = COPY[lang]
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')   // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const tgHref = `https://t.me/BalinskyBot`
  const waPrefill = listing
    ? `${c.waPrefill} ${listing.title}`
    : c.waPrefillGeneric
  const waHref = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(waPrefill)}`
  const emailHref = listing
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(listing.title)}`
    : `mailto:${CONTACT_EMAIL}`

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'sending') return
    setState('sending')
    setErrMsg(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, message, website,
          listingKind: listing?.kind,
          listingSlug: listing?.slug,
          listingTitle: listing?.title,
          page: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrMsg(data?.error ?? null)
        setState('error')
        return
      }
      setState('success')
      setName(''); setEmail(''); setPhone(''); setMessage('')
    } catch {
      setState('error')
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
      <h3 className="text-[18px] md:text-[20px] font-semibold text-[#111827] mb-1">{c.heading}</h3>
      <p className="text-[13px] text-[var(--color-text-muted)] mb-4">{c.sub}</p>

      <div className="flex flex-wrap gap-2 mb-5">
        <a href={tgHref} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#229ED9] text-white text-[14px] font-semibold no-underline">
          <Send size={16} /> {c.tg}
        </a>
        <a href={waHref} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-[14px] font-semibold no-underline">
          <MessageCircle size={16} /> {c.wa}
        </a>
        <a href={emailHref} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[#111827] text-[14px] font-semibold no-underline">
          <Mail size={16} /> {c.email}
        </a>
      </div>

      {variant === 'inline' && (
        <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-search-bg)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-[14px] text-[var(--color-text-muted)]">
            {c.or}
          </summary>
          <form onSubmit={onSubmit} className="p-4 space-y-3">
            {/* Honeypot — bots fill every field, real users never see this one */}
            <input
              type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={website} onChange={e => setWebsite(e.target.value)}
              className="absolute left-[-9999px] w-0 h-0 opacity-0 pointer-events-none"
            />
            <label className="block">
              <span className="block text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{c.name}</span>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder={c.nameP}
                className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Email</span>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={c.emailP}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </label>
              <label className="block">
                <span className="block text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{c.phone}</span>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={c.phoneP}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </label>
            </div>
            <label className="block">
              <span className="block text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{c.msg}</span>
              <textarea required rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder={c.msgP}
                className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <button type="submit" disabled={state === 'sending' || state === 'success'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold disabled:opacity-60"
              >
                {state === 'sending' && <Loader2 size={16} className="animate-spin" />}
                {state === 'success' && <CheckCircle2 size={16} />}
                {state === 'sending' ? c.sending : state === 'success' ? c.success.split('.')[0] + '.' : c.submit}
              </button>
              {state === 'error' && (
                <span className="text-[12px] text-red-600">{errMsg ? `${c.error} (${errMsg})` : c.error}</span>
              )}
            </div>
            {state === 'success' && (
              <p className="text-[13px] text-[#1F8B5F]">{c.success}</p>
            )}
          </form>
        </details>
      )}
    </section>
  )
}
