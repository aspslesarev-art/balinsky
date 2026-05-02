'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, Tag, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useAdminTheme, themeClass, ThemeToggle } from '../_theme'

type TagRow = { tag: string; count: number }
type SendResult = { ok: boolean; sent?: number; failed?: number; total?: number; error?: string }

export function BroadcastUI() {
  const { theme, toggle: toggleTheme } = useAdminTheme()
  const [tags, setTags] = useState<TagRow[]>([])
  const [loadingTags, setLoadingTags] = useState(true)
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/broadcast', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (!cancelled) setTags(j.tags ?? []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingTags(false) })
    return () => { cancelled = true }
  }, [])

  const send = async () => {
    if (!selectedTag || !text.trim()) return
    const reach = tags.find(t => t.tag === selectedTag)?.count ?? 0
    if (!confirm(`Отправить сообщение ${reach} получателям с меткой «${selectedTag}»?`)) return
    setSending(true); setResult(null)
    try {
      const r = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: selectedTag, text: text.trim() }),
      })
      const j = await r.json() as SendResult
      setResult(j)
      if (j.ok) setText('')
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : String(e) })
    } finally {
      setSending(false)
    }
  }

  const reach = tags.find(t => t.tag === selectedTag)?.count ?? 0

  return (
    <div className={`min-h-screen bg-[var(--ax-bg)] text-[var(--ax-fg)] ${themeClass(theme)}`}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin/chats" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] no-underline">
            <ArrowLeft size={14} /> К чатам
          </Link>
          <ThemeToggle theme={theme} toggle={toggleTheme} />
        </div>

        <h1 className="text-[22px] font-semibold mb-1">Рассылка по метке</h1>
        <p className="text-[13px] text-[var(--ax-fg-muted)] mb-6">
          Сообщение придёт всем, кто хотя бы раз нажал кнопку с этой меткой
          (например, регистрировался на мероприятие или открывал контакт застройщика).
        </p>

        <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-5 mb-4">
          <label className="block text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-2">Метка</label>
          {loadingTags ? (
            <div className="text-[13px] text-[var(--ax-fg-muted)] inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Загружаю метки…</div>
          ) : tags.length === 0 ? (
            <div className="text-[13px] text-[var(--ax-fg-muted)]">Меток ещё нет — никто не нажимал кнопку с привязкой к мероприятию или застройщику.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map(t => {
                const active = t.tag === selectedTag
                return (
                  <button
                    key={t.tag}
                    onClick={() => setSelectedTag(t.tag)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border ${
                      active
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--ax-hover)] text-[var(--ax-fg-soft)] border-[var(--ax-border)] hover:text-[var(--ax-fg)]'
                    }`}
                  >
                    <Tag size={11} /> {t.tag}
                    <span className={`${active ? 'text-white/70' : 'text-[var(--ax-fg-faint)]'} text-[11px]`}>· {t.count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-5">
          <label className="block text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-2">
            Сообщение {selectedTag && <span className="ml-1 text-[var(--ax-fg-soft)] normal-case tracking-normal">— получит {reach} {reach === 1 ? 'человек' : 'людей'}</span>}
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            placeholder={selectedTag
              ? 'Напишите сообщение. Поддерживается HTML: <b>, <i>, <a href="…">…</a>'
              : 'Сначала выберите метку выше'}
            disabled={!selectedTag}
            className="w-full rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] px-4 py-3 text-[14px] text-[var(--ax-fg)] placeholder:text-[var(--ax-fg-faint)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50 resize-none"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] text-[var(--ax-fg-faint)]">
              Подсказка: HTML-разметка как в Telegram. Ссылки превью свернуты.
            </div>
            <button
              onClick={send}
              disabled={!selectedTag || !text.trim() || sending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium disabled:opacity-50"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Отправка…' : 'Отправить'}
            </button>
          </div>
        </div>

        {result && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-[13px] inline-flex items-center gap-2 ${
            result.ok
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]'
              : 'bg-[var(--ax-error-bg)] text-[var(--ax-error-fg)] border border-[var(--ax-error-border)]'
          }`}>
            {result.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {result.ok
              ? `Отправлено ${result.sent ?? 0} из ${result.total ?? 0}${result.failed ? ` · не доставлено ${result.failed}` : ''}`
              : `Ошибка: ${result.error ?? 'неизвестная'}`}
          </div>
        )}
      </div>
    </div>
  )
}
