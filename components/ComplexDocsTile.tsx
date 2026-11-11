'use client'

// Плитка «Документы» в медиаблоке виллы (макет «Блок Документы», вариант C,
// место - плитка в медиаблоке; решение владельца 2026-11-11). Плитка
// открывает панель справа: что проверено + документ-доказательство, ниже
// все файлы по разделам. Файлы открываются после заявки (кука bx_lead,
// /api/complex/[slug]/docs); заявка уходит только владельцу.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Download, FileText, Lock, X } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { ComplexDoc, ComplexDocs } from '@/lib/complex-docs'
import { MEDIA_TILE, MediaTileLabel } from './media-tile'

const COPY = {
  ru: {
    tile: 'Документы',
    title: 'Документы и проверка',
    lead: (n: number) => `Что проверено и документ, который это подтверждает. Всего ${n} файлов от застройщика.`,
    checked: 'Проверено',
    all: 'Все документы',
    open: 'Открыть',
    download: 'Скачать',
    close: 'Закрыть',
    mb: 'МБ',
    gateTitle: 'Документы откроются после заявки',
    gateText: 'Оставьте имя и контакт - сразу откроем все файлы. Пишем только по этому объекту.',
    name: 'Имя',
    contact: 'Telegram или телефон',
    send: 'Открыть документы',
    sending: 'Отправляем…',
    errName: 'Напишите имя',
    errContact: 'Нужен ник Telegram (@name) или телефон',
    errSend: 'Не получилось отправить. Попробуйте ещё раз.',
    note: 'Паспорта собственников земли не публикуем.',
  },
  en: {
    tile: 'Documents',
    title: 'Documents and checks',
    lead: (n: number) => `What was checked and the document that proves it. ${n} files from the developer.`,
    checked: 'Checked',
    all: 'All documents',
    open: 'Open',
    download: 'Download',
    close: 'Close',
    mb: 'MB',
    gateTitle: 'Documents open after a request',
    gateText: 'Leave your name and contact and all files open right away. We only write about this property.',
    name: 'Name',
    contact: 'Telegram or phone',
    send: 'Open documents',
    sending: 'Sending…',
    errName: 'Enter your name',
    errContact: 'Telegram handle (@name) or phone number needed',
    errSend: 'Could not send. Please try again.',
    note: 'Landowners’ ID documents are not published.',
  },
} as const

const STORE_KEY = 'bx_lead_contact'

function isPhone(s: string): boolean {
  if (!/^\+?[\d\s()\-.]+$/.test(s)) return false
  const digits = s.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}
function tgHandle(s: string): string | null {
  const m = s.trim().match(/^(?:@|(?:https?:\/\/)?t\.me\/)?([a-zA-Z][a-zA-Z0-9_]{4,31})$/)
  return m ? `@${m[1]}` : null
}

export function ComplexDocsTile({ docs, cover, lang, listingTitle }: {
  docs: ComplexDocs
  cover: string | null
  lang: Lang
  listingTitle: string
}) {
  const c = pickCopy(COPY, lang)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={MEDIA_TILE} aria-label={c.tile}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="w-full h-full object-cover" />
        )}
        <MediaTileLabel icon={<FileText size={18} aria-hidden />}>{c.tile}</MediaTileLabel>
      </button>
      {open && <DocsPanel docs={docs} lang={lang} listingTitle={listingTitle} onClose={() => setOpen(false)} />}
    </>
  )
}

function DocsPanel({ docs, lang, listingTitle, onClose }: {
  docs: ComplexDocs; lang: Lang; listingTitle: string; onClose: () => void
}) {
  const c = pickCopy(COPY, lang)
  const isRu = lang === 'ru' || lang === 'uk'
  const t = (x: { ru: string; en: string }) => (isRu ? x.ru : x.en)
  const byFile = new Map(docs.docs.map(d => [d.file, d]))
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [showGate, setShowGate] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/complex/${encodeURIComponent(docs.slug)}/docs?check=1`)
      .then(r => (r.ok ? r.json() : { unlocked: false }))
      .then((j: { unlocked?: boolean }) => { if (!cancelled) setUnlocked(!!j.unlocked) })
      .catch(() => { if (!cancelled) setUnlocked(false) })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelled = true
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [docs.slug, onClose])

  const askLead = useCallback(() => {
    setShowGate(true)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const href = (d: ComplexDoc, dl = false) =>
    `/api/complex/${encodeURIComponent(docs.slug)}/docs?f=${encodeURIComponent(d.file)}${dl ? '&dl=1' : ''}`
  const size = (d: ComplexDoc) => `${d.mb < 0.1 ? '0,1' : String(Math.round(d.mb * 10) / 10).replace('.', isRu ? ',' : '.')} ${c.mb}`

  const DocLink = ({ d, compact = false }: { d: ComplexDoc; compact?: boolean }) => {
    const cls = 'flex items-center gap-3 w-full text-left rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] transition-colors duration-[120ms] cursor-pointer'
    const body = (
      <>
        <FileText size={16} className="shrink-0 text-[var(--color-primary)]" aria-hidden />
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[14px] leading-snug text-[var(--color-text)]">{t(d.name)}</span>
          {!compact && <span className="text-[13px] leading-snug text-[var(--color-text-soft)]">{t(d.what)}</span>}
        </span>
        <span className="shrink-0 text-[12px] text-[var(--color-text-soft)] tabular-nums">{size(d)}</span>
        {unlocked === false && <Lock size={14} className="shrink-0 text-[var(--color-text-soft)]" aria-hidden />}
      </>
    )
    if (!unlocked) {
      return <button type="button" onClick={askLead} className={`${cls} px-3 py-2.5`}>{body}</button>
    }
    return (
      <div className="flex items-stretch gap-2">
        <a href={href(d)} target="_blank" rel="noopener noreferrer" className={`${cls} px-3 py-2.5 no-underline`} aria-label={`${c.open}: ${t(d.name)}`}>{body}</a>
        <a href={href(d, true)} aria-label={`${c.download}: ${t(d.name)}`}
          className="shrink-0 inline-flex w-11 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] transition-colors duration-[120ms]">
          <Download size={16} aria-hidden />
        </a>
      </div>
    )
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/40" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="docs-panel-title"
        className="relative h-full w-full sm:max-w-[560px] bg-[#FAFBFA] shadow-[0_1px_2px_rgb(0_0_0/.04),0_12px_32px_rgb(0_0_0/.12)] flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-[var(--color-border)] bg-white">
          <div className="flex flex-col gap-2">
            <h2 id="docs-panel-title" className="m-0 text-[24px] font-semibold tracking-tight leading-[1.2] text-[var(--color-text)]">{c.title}</h2>
            <p className="m-0 text-[14px] leading-[1.55] text-[var(--color-text-soft)]">{c.lead(docs.docs.length)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={c.close}
            className="shrink-0 -mr-2 -mt-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-search-bg)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer transition-colors">
            <X size={20} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8">
          {unlocked === false && showGate && <LeadGate lang={lang} listingTitle={listingTitle} onDone={() => { setUnlocked(true); setShowGate(false) }} />}

          <section className="flex flex-col">
            {docs.checks.map((ch, i) => (
              <div key={i} className="flex gap-3 py-4 border-t border-[var(--color-border)] first:border-t-0 first:pt-0">
                <span className="shrink-0 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(27_110_74/0.12)] text-[var(--color-primary)]">
                  <Check size={14} strokeWidth={3} aria-hidden />
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="m-0 text-[16px] font-semibold leading-snug text-[var(--color-text)]">{t(ch.title)}</h3>
                    <p className="m-0 text-[14px] leading-[1.55] text-[var(--color-text-soft)]">{t(ch.text)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {ch.files.map(f => byFile.get(f)).filter((d): d is ComplexDoc => !!d).map(d => <DocLink key={d.file} d={d} compact />)}
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-6">
            <h3 className="m-0 text-[20px] font-semibold tracking-tight text-[var(--color-text)]">{c.all}</h3>
            {docs.groups.map((g, i) => (
              <div key={i} className="flex flex-col gap-2">
                <h4 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">{t(g.title)}</h4>
                {g.files.map(f => byFile.get(f)).filter((d): d is ComplexDoc => !!d).map(d => <DocLink key={d.file} d={d} />)}
              </div>
            ))}
            <p className="m-0 text-[13px] text-[var(--color-text-soft)]">{c.note}</p>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function LeadGate({ lang, listingTitle, onDone }: { lang: Lang; listingTitle: string; onDone: () => void }) {
  const c = pickCopy(COPY, lang)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as { name?: string; phone?: string; telegram?: string } | null
      if (saved) { setName(saved.name ?? ''); setContact(saved.telegram || saved.phone || '') }
    } catch { /* приватный режим */ }
    nameRef.current?.focus()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const raw = contact.trim()
    if (!n) { setError(c.errName); return }
    const phone = isPhone(raw) ? raw : ''
    const telegram = phone ? '' : tgHandle(raw) ?? ''
    if (!phone && !telegram) { setError(c.errContact); return }
    setError(null)
    setBusy(true)
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: n, phone: phone || undefined, telegram: telegram || undefined, website,
          listingTitle, message: 'Хочет посмотреть документы', page: 'docs', pagePath: window.location.pathname,
        }),
      })
      if (!r.ok) throw new Error(`status ${r.status}`)
      try {
        const prev = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Record<string, string>
        localStorage.setItem(STORE_KEY, JSON.stringify({ ...prev, name: n, ...(phone ? { phone } : { telegram }) }))
      } catch { /* не критично */ }
      onDone()
    } catch (err) {
      console.error('[docs] lead failed', err)
      setError(c.errSend)
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-white text-[16px] text-[var(--color-text)] outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 transition-[border-color,box-shadow] duration-[120ms]'
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-[var(--color-primary)] bg-white p-5">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-[17px] font-semibold text-[var(--color-text)]">{c.gateTitle}</h3>
        <p className="m-0 text-[14px] leading-[1.55] text-[var(--color-text-soft)]">{c.gateText}</p>
      </div>
      <label className="sr-only" htmlFor="docs-lead-name">{c.name}</label>
      <input id="docs-lead-name" ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder={c.name} autoComplete="name" className={inputCls} />
      <label className="sr-only" htmlFor="docs-lead-contact">{c.contact}</label>
      <input id="docs-lead-contact" value={contact} onChange={e => setContact(e.target.value)} placeholder={c.contact} autoComplete="tel" className={inputCls} />
      <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} className="hidden" />
      {error && <p role="alert" className="m-0 text-[14px] text-[#B42318]">{error}</p>}
      <button type="submit" disabled={busy}
        className="h-12 rounded-xl bg-[var(--color-primary)] text-white text-[15px] font-semibold cursor-pointer hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] transition-[filter] duration-[120ms]">
        {busy ? c.sending : c.send}
      </button>
    </form>
  )
}
