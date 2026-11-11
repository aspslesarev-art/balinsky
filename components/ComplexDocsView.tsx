'use client'

// Вкладка «Документы» в полноэкранном окне медиаблока (как фото, планировки,
// реклама; решение владельца 2026-11-11). Слева - что проверено и все файлы,
// справа - выбранный PDF прямо в окне (на телефоне файл открывается отдельно).
// Файлы открываются после заявки: кука bx_lead, /api/complex/[slug]/docs;
// заявка page='docs' уходит только владельцу.

import { useEffect, useRef, useState } from 'react'
import { Check, Download, ExternalLink, FileText, Lock } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { ComplexDoc, ComplexDocs } from '@/lib/complex-docs'

const COPY = {
  ru: {
    lead: (n: number) => `Что проверено и документ, который это подтверждает. Всего ${n} файлов от застройщика.`,
    all: 'Все документы',
    open: 'Открыть',
    newTab: 'Открыть отдельно',
    download: 'Скачать',
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
    lead: (n: number) => `What was checked and the document that proves it. ${n} files from the developer.`,
    all: 'All documents',
    open: 'Open',
    newTab: 'Open separately',
    download: 'Download',
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

// Превью PDF справа только на широком экране: на телефоне встроенный PDF
// показывает одну страницу, там файл открывается отдельно.
function useWide() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export function ComplexDocsView({ docs, lang, listingTitle }: { docs: ComplexDocs; lang: Lang; listingTitle: string }) {
  const c = pickCopy(COPY, lang)
  const isRu = lang === 'ru' || lang === 'uk'
  const t = (x: { ru: string; en: string }) => (isRu ? x.ru : x.en)
  const byFile = new Map(docs.docs.map(d => [d.file, d]))
  const wide = useWide()
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<string>(docs.checks[0]?.files[0] ?? docs.docs[0]?.file ?? '')
  const [showGate, setShowGate] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/complex/${encodeURIComponent(docs.slug)}/docs?check=1`)
      .then(r => (r.ok ? r.json() : { unlocked: false }))
      .then((j: { unlocked?: boolean }) => { if (!cancelled) setUnlocked(!!j.unlocked) })
      .catch(() => { if (!cancelled) setUnlocked(false) })
    return () => { cancelled = true }
  }, [docs.slug])

  const href = (d: ComplexDoc, dl = false) =>
    `/api/complex/${encodeURIComponent(docs.slug)}/docs?f=${encodeURIComponent(d.file)}${dl ? '&dl=1' : ''}`
  const size = (d: ComplexDoc) => `${d.mb < 0.1 ? '0,1' : String(Math.round(d.mb * 10) / 10).replace('.', isRu ? ',' : '.')} ${c.mb}`

  function pick(d: ComplexDoc) {
    setSelected(d.file)
    if (unlocked) {
      if (!wide) window.open(href(d), '_blank', 'noopener')
      return
    }
    setShowGate(true)
    if (!wide) listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cur = byFile.get(selected) ?? docs.docs[0]
  const gate = <LeadGate lang={lang} listingTitle={listingTitle} onDone={() => { setUnlocked(true); setShowGate(false) }} />

  const Row = ({ d, compact = false }: { d: ComplexDoc; compact?: boolean }) => {
    const active = wide && d.file === selected
    return (
      <div className="flex items-stretch gap-2">
        <button type="button" onClick={() => pick(d)} aria-label={`${c.open}: ${t(d.name)}`}
          className={`flex flex-1 min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left cursor-pointer transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-white ${active ? 'border-white/40 bg-white/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
          <FileText size={16} className="shrink-0 text-[#8FD9B3]" aria-hidden />
          <span className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-[14px] leading-snug text-white">{t(d.name)}</span>
            {!compact && <span className="text-[13px] leading-snug text-white/65">{t(d.what)}</span>}
          </span>
          <span className="shrink-0 text-[12px] text-white/60 tabular-nums">{size(d)}</span>
          {unlocked === false && <Lock size={14} className="shrink-0 text-white/60" aria-hidden />}
        </button>
        {unlocked && (
          <a href={href(d, true)} aria-label={`${c.download}: ${t(d.name)}`}
            className="shrink-0 inline-flex w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white transition-colors duration-[120ms]">
            <Download size={16} aria-hidden />
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full max-w-[1280px] mx-auto flex gap-6 text-white">
      <div ref={listRef} className="w-full lg:w-[400px] lg:shrink-0 h-full overflow-y-auto pr-1 flex flex-col gap-8 pb-6">
        <p className="m-0 text-[14px] leading-[1.55] text-white/75">{c.lead(docs.docs.length)}</p>
        {!wide && unlocked === false && showGate && gate}

        <section className="flex flex-col">
          {docs.checks.map((ch, i) => (
            <div key={i} className="flex gap-3 py-4 border-t border-white/10 first:border-t-0 first:pt-0">
              <span className="shrink-0 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#8FD9B3]/15 text-[#8FD9B3]">
                <Check size={14} strokeWidth={3} aria-hidden />
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="m-0 text-[16px] font-semibold leading-snug">{t(ch.title)}</h3>
                  <p className="m-0 text-[14px] leading-[1.55] text-white/70">{t(ch.text)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {ch.files.map(f => byFile.get(f)).filter((d): d is ComplexDoc => !!d).map(d => <Row key={d.file} d={d} compact />)}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-6">
          <h3 className="m-0 text-[20px] font-semibold tracking-tight">{c.all}</h3>
          {docs.groups.map((g, i) => (
            <div key={i} className="flex flex-col gap-2">
              <h4 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-white/60">{t(g.title)}</h4>
              {g.files.map(f => byFile.get(f)).filter((d): d is ComplexDoc => !!d).map(d => <Row key={d.file} d={d} />)}
            </div>
          ))}
          <p className="m-0 text-[13px] text-white/60">{c.note}</p>
        </section>
      </div>

      {wide && cur && (
        <div className="flex-1 min-w-0 h-full flex flex-col gap-3 pb-6">
          <div className="flex items-center gap-3">
            <span className="flex-1 min-w-0 truncate text-[16px] font-semibold">{t(cur.name)}</span>
            {unlocked && <>
              <a href={href(cur)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-10 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-[14px] font-medium text-white no-underline transition-colors duration-[120ms]">
                <ExternalLink size={16} aria-hidden />{c.newTab}
              </a>
              <a href={href(cur, true)} className="inline-flex items-center gap-2 h-10 px-3 rounded-lg bg-white text-[#101814] hover:bg-white/90 text-[14px] font-semibold no-underline transition-colors duration-[120ms]">
                <Download size={16} aria-hidden />{c.download}
              </a>
            </>}
          </div>
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
            {unlocked ? (
              <iframe key={cur.file} src={href(cur)} title={t(cur.name)} className="w-full h-full border-0 bg-white" />
            ) : unlocked === false ? (
              <div className="w-full max-w-[420px] px-4">{gate}</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function LeadGate({ lang, listingTitle, onDone }: { lang: Lang; listingTitle: string; onDone: () => void }) {
  const c = pickCopy(COPY, lang)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as { name?: string; phone?: string; telegram?: string } | null
      if (saved) { setName(saved.name ?? ''); setContact(saved.telegram || saved.phone || '') }
    } catch { /* приватный режим */ }
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
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-white p-5 text-[var(--color-text)]">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-[17px] font-semibold">{c.gateTitle}</h3>
        <p className="m-0 text-[14px] leading-[1.55] text-[var(--color-text-soft)]">{c.gateText}</p>
      </div>
      <label className="sr-only" htmlFor="docs-lead-name">{c.name}</label>
      <input id="docs-lead-name" value={name} onChange={e => setName(e.target.value)} placeholder={c.name} autoComplete="name" className={inputCls} />
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
