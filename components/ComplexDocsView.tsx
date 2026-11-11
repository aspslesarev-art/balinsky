'use client'

// Вкладка «Документы» окна медиаблока (макеты «Окно медиаблока» 7, 8 и
// телефон, владелец 2026-11-11). Компьютер: слева что проверено с кнопками
// документов, справа выбранный PDF. Телефон: список, документ открывается
// на весь экран. Файлы видят только вошедшие с Pro (/api/complex/[slug]/docs,
// решение владельца 2026-11-11); остальным - кнопка «Открыть в Pro».

import { useEffect, useState } from 'react'
import { Check, Download, ExternalLink, FileText, Lock } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { ComplexDoc, ComplexDocs } from '@/lib/complex-docs'

const COPY = {
  ru: {
    summary: 'Что проверено',
    summaryOpen: (n: number) => `${n} документов от застройщика`,
    summaryLocked: 'Пункты видны всем, файлы - в Pro',
    allBtn: (n: number) => `Все ${n} документов по разделам`,
    checksBtn: 'Назад к проверке',
    newTab: 'Открыть отдельно',
    download: 'Скачать',
    open: 'Открыть',
    mb: 'МБ',
    tapHint: 'Нажмите на документ - он откроется на весь экран',
    proBtn: 'Открыть в Pro',
    proHint: 'Войдите и откройте Pro - файлы откроются здесь',
    proTitle: (n: number) => `${n} документов - в Pro`,
    proText: 'Сертификаты на землю, разрешения, справки нотариуса и проверка участка. Войдите и откройте Pro - все файлы откроются прямо здесь.',
    note: 'Паспорта собственников земли не публикуем.',
    close: 'Закрыть',
  },
  en: {
    summary: 'What was checked',
    summaryOpen: (n: number) => `${n} documents from the developer`,
    summaryLocked: 'Checks are public, files are in Pro',
    allBtn: (n: number) => `All ${n} documents by section`,
    checksBtn: 'Back to checks',
    newTab: 'Open separately',
    download: 'Download',
    open: 'Open',
    mb: 'MB',
    tapHint: 'Tap a document to open it full screen',
    proBtn: 'Open in Pro',
    proHint: 'Sign in with Pro and the files open here',
    proTitle: (n: number) => `${n} documents - in Pro`,
    proText: 'Land certificates, permits, notary covernotes and the plot check. Sign in with Pro and every file opens right here.',
    note: 'Landowners’ ID documents are not published.',
    close: 'Close',
  },
} as const

function useWide() {
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export function ComplexDocsView({ docs, lang }: { docs: ComplexDocs; lang: Lang; listingTitle?: string }) {
  const c = pickCopy(COPY, lang)
  const isRu = lang === 'ru' || lang === 'uk'
  const t = (x: { ru: string; en: string }) => (isRu ? x.ru : x.en)
  const byFile = new Map(docs.docs.map(d => [d.file, d]))
  const n = docs.docs.length
  const wide = useWide()
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<string>(docs.checks[0]?.files[0] ?? docs.docs[0]?.file ?? '')
  const [showAll, setShowAll] = useState(false)

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
  const filesOf = (files: string[]) => files.map(f => byFile.get(f)).filter((d): d is ComplexDoc => !!d)
  const cur = byFile.get(selected) ?? docs.docs[0]
  const proHref = () => `/pro?next=${encodeURIComponent(window.location.pathname)}`

  function pick(d: ComplexDoc) {
    setSelected(d.file)
    if (!wide) {
      if (unlocked) window.open(href(d), '_blank', 'noopener')
      else window.location.href = proHref()
    }
  }

  // ── Телефон ──────────────────────────────────────────────────────────────
  if (!wide) {
    const row = (d: ComplexDoc) => (
      <div key={d.file} className="flex gap-2">
        <button type="button" onClick={() => pick(d)} className="flex-1 min-w-0 min-h-[52px] px-3 rounded-[10px] border border-white/[0.12] bg-white/5 text-left flex items-center gap-2.5 cursor-pointer">
          <FileText size={16} className="shrink-0 text-[#8FD9B3]" aria-hidden />
          <span className="flex-1 min-w-0 text-[14px] leading-snug">{t(d.name)}</span>
          <span className="shrink-0 text-[12px] text-white/55 tabular-nums">{size(d)}</span>
        </button>
        <a href={href(d, true)} aria-label={`${c.download}: ${t(d.name)}`} className="shrink-0 w-[52px] h-[52px] rounded-[10px] border border-white/[0.12] bg-white/5 flex items-center justify-center text-white">
          <Download size={18} aria-hidden />
        </a>
      </div>
    )
    return (
      <div className="relative h-full flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
          {docs.checks.map((ch, i) => (
            <section key={i} className="flex flex-col gap-2 pt-3 border-t border-white/[0.08] first:border-t-0 first:pt-1">
              <div className="flex gap-2.5 items-baseline">
                <Check size={14} strokeWidth={3} className="shrink-0 text-[#8FD9B3] translate-y-0.5" aria-hidden />
                <h3 className="m-0 text-[15px] font-semibold leading-snug">{t(ch.title)}</h3>
              </div>
              {unlocked
                ? <div className="flex flex-col gap-2">{filesOf(ch.files).map(row)}</div>
                : <p className="m-0 pl-6 text-[13px] text-white/60">{filesOf(ch.files).map(d => t(d.name)).join(' · ')}</p>}
            </section>
          ))}
          {unlocked && (
            <>
              {docs.groups.map((g, i) => (
                <section key={`g${i}`} className="flex flex-col gap-2 pt-3 border-t border-white/[0.08]">
                  <h4 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-white/60">{t(g.title)}</h4>
                  {filesOf(g.files).map(row)}
                </section>
              ))}
              <p className="m-0 text-[13px] text-white/55">{c.tapHint}</p>
            </>
          )}
          <p className="m-0 text-[13px] text-white/45">{c.note}</p>
        </div>
        {unlocked === false && (
          <div className="shrink-0 px-4 pt-3 pb-2 flex flex-col gap-1.5 bg-[#0C100E] shadow-[0_-8px_24px_rgb(0_0_0/.4)]">
            <a href={proHref()} className="h-[52px] rounded-xl bg-white text-[#101814] text-[16px] font-semibold inline-flex items-center justify-center gap-2 no-underline">
              <Lock size={16} aria-hidden />{c.proBtn}
            </a>
            <span className="text-center text-[12px] text-white/55">{c.proHint}</span>
          </div>
        )}
      </div>
    )
  }

  // ── Компьютер ────────────────────────────────────────────────────────────
  const chip = (d: ComplexDoc) => {
    const on = d.file === selected
    return (
      <button key={d.file} type="button" onClick={() => pick(d)} title={t(d.what)}
        className={`h-8 px-2.5 rounded-lg border text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-white ${on ? 'border-white/50 bg-white/[0.14] text-white' : 'border-white/[0.12] bg-white/[0.04] text-white/85 hover:bg-white/10'}`}>
        {unlocked === false ? <Lock size={12} aria-hidden /> : <FileText size={14} className="text-[#8FD9B3]" aria-hidden />}
        {t(d.name)}
      </button>
    )
  }

  return (
    <div className="h-full flex">
      <aside className="w-[420px] shrink-0 border-r border-white/[0.08] flex flex-col">
        <div className="px-6 py-5 flex items-center gap-3 border-b border-white/[0.08]">
          <span className="shrink-0 w-10 h-10 rounded-full bg-[#8FD9B3] text-[#0C100E] flex items-center justify-center"><Check size={20} strokeWidth={2.6} aria-hidden /></span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{c.summary}</span>
            <span className="text-[13px] text-white/60">{unlocked === false ? c.summaryLocked : c.summaryOpen(n)}</span>
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-4 flex flex-col">
          {!showAll ? docs.checks.map((ch, i) => (
            <div key={i} className="px-2 py-3 border-b border-white/[0.06] flex flex-col gap-2">
              <div className="flex gap-2.5 items-baseline">
                <Check size={14} strokeWidth={3} className="shrink-0 text-[#8FD9B3] translate-y-0.5" aria-hidden />
                <span className="text-[15px] font-semibold leading-snug">{t(ch.title)}</span>
              </div>
              <p className="m-0 pl-6 text-[13px] leading-[1.5] text-white/60">{t(ch.text)}</p>
              <div className="pl-6 flex flex-wrap gap-1.5">{filesOf(ch.files).map(chip)}</div>
            </div>
          )) : docs.groups.map((g, i) => (
            <div key={i} className="px-2 py-3 border-b border-white/[0.06] flex flex-col gap-2">
              <span className="text-[13px] font-semibold uppercase tracking-wide text-white/60">{t(g.title)}</span>
              <div className="flex flex-wrap gap-1.5">{filesOf(g.files).map(chip)}</div>
            </div>
          ))}
          <button type="button" onClick={() => setShowAll(v => !v)} className="mt-3 h-11 shrink-0 rounded-[10px] border border-white/15 text-[14px] font-semibold hover:bg-white/5 cursor-pointer">
            {showAll ? c.checksBtn : c.allBtn(n)}
          </button>
          <p className="m-0 mt-3 px-2 text-[12px] text-white/45">{c.note}</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {unlocked && cur && (
          <div className="h-16 shrink-0 flex items-center gap-3 px-6 border-b border-white/[0.08]">
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold truncate">{t(cur.name)}</span>
              <span className="text-[13px] text-white/60 truncate">{t(cur.what)} · PDF · {size(cur)}</span>
            </span>
            <a href={href(cur)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-[14px] text-white no-underline transition-colors duration-[120ms]">
              <ExternalLink size={16} aria-hidden />{c.newTab}
            </a>
            <a href={href(cur, true)} className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg bg-white hover:bg-white/90 text-[14px] font-semibold text-[#101814] no-underline transition-colors duration-[120ms]">
              <Download size={16} aria-hidden />{c.download}
            </a>
          </div>
        )}
        <div className="relative flex-1 min-h-0 bg-[#151B18] flex items-center justify-center">
          {unlocked && cur ? (
            <iframe key={cur.file} src={`${href(cur)}#toolbar=0&navpanes=0&view=FitH`} title={t(cur.name)} className="absolute inset-6 w-[calc(100%-48px)] h-[calc(100%-48px)] border-0 rounded bg-white" />
          ) : unlocked === false ? (
            <>
              <div className="absolute inset-6 flex justify-center blur-[6px] opacity-35" aria-hidden>
                <div className="w-[520px] h-full max-h-[736px] bg-white rounded-sm" />
              </div>
              <div className="relative w-[440px] max-w-[calc(100%-48px)] p-8 rounded-2xl bg-white shadow-[0_1px_2px_rgb(0_0_0/.2),0_16px_40px_rgb(0_0_0/.35)]">
                <div className="flex flex-col gap-4 text-[#18201C]">
                  <h3 className="m-0 text-[24px] font-semibold tracking-[-0.01em] leading-[1.2]">{c.proTitle(n)}</h3>
                  <p className="m-0 text-[15px] leading-[1.55] text-[#4C5751]">{c.proText}</p>
                  <a href={proHref()} className="h-[52px] rounded-xl bg-[var(--color-primary)] text-white text-[16px] font-semibold inline-flex items-center justify-center gap-2 no-underline hover:brightness-110 transition-[filter] duration-[120ms]"><Lock size={16} aria-hidden />{c.proBtn}</a>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
