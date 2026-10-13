'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ChevronRight, ImagePlus, Loader2, SlidersHorizontal, Star, Trash2, X } from 'lucide-react'
import { COLLECTION_OF, KIND_LABEL, SECTIONS, type EditKind, type EditorRole } from '@/lib/page-edit/schema'
import { getCollection } from '@/lib/admin/collections'
import { AddButton, Field, uploadError, type FieldValue } from './fields'

// Окно правки страницы: разделы с понятными полями, фото, объекты внутри
// (ЖК застройщика, юниты ЖК). Можно провалиться в объект и вернуться назад.

// Старая полная панель «все поля» — только для команды, грузится по кнопке.
const RecordPanel = dynamic(
  () => import('@/app/admin/data/[collection]/_panel').then(m => ({ default: m.RecordPanel })),
  { ssr: false, loading: () => null },
)

type Child = { kind: EditKind; id: string; title: string; subtitle: string; published: boolean }
type Payload = {
  kind: EditKind
  id: string
  title: string
  role: EditorRole
  values: Record<string, FieldValue>
  photos: string[] | null
  complex: { id: string; name: string } | null
  children: Child[]
}

/** Что открыто: запись или форма нового юнита внутри ЖК. */
type View =
  | { kind: EditKind; id: string }
  | { kind: 'villa' | 'apartment'; newIn: { id: string; name: string } }

const viewKey = (v: View) => ('id' in v ? `${v.kind}:${v.id}` : `new:${v.kind}:${v.newIn.id}`)

const ERRORS: Record<string, string> = {
  bad_point: 'Точка не на Бали - проверьте ссылку на карту.',
  too_long: 'Слишком длинный текст.',
  bad_number: 'Проверьте числа.',
  unauthorized: 'Нет доступа - войдите заново.',
  not_found: 'Запись не найдена - возможно, её удалили.',
}
const errorText = (code?: string) => (code && ERRORS[code]) || 'Не получилось сохранить. Попробуйте ещё раз.'

export function PageEditSheet({ kind, id, onClose }: { kind: EditKind; id: string; onClose: () => void }) {
  const router = useRouter()
  const [stack, setStack] = useState<View[]>([{ kind, id }])
  const [dirty, setDirty] = useState(false)
  const [askClose, setAskClose] = useState<null | 'close' | 'back'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const rememberTitle = useCallback((key: string, t: string) => setTitles(prev => ({ ...prev, [key]: t })), [])
  const top = stack[stack.length - 1]
  const title = 'newIn' in top ? (top.kind === 'villa' ? 'Новая вилла' : 'Новые апартаменты') : titles[viewKey(top)] ?? ''

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(t => (t === msg ? null : t)), 3200)
  }, [])

  // Закрытие по Esc и блокировка прокрутки страницы под окном.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestLeave('close') }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  })

  const leave = (how: 'close' | 'back') => {
    setAskClose(null); setDirty(false)
    if (how === 'back' && stack.length > 1) setStack(s => s.slice(0, -1))
    else { onClose(); router.refresh() }
  }
  const requestLeave = (how: 'close' | 'back') => { if (dirty) setAskClose(how); else leave(how) }
  const open = (v: View) => { if (dirty) { setAskClose(null); notify('Сначала сохраните изменения'); return } setStack(s => [...s, v]) }
  const replaceTop = (v: View) => setStack(s => [...s.slice(0, -1), v])

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end" role="dialog" aria-modal="true" aria-label="Редактирование страницы">
      <div className="absolute inset-0 bg-[rgb(15_26_21/0.45)] motion-safe:animate-[fadeIn_200ms_var(--ease-out)]" onClick={() => requestLeave('close')} />
      <div className="relative flex h-full w-full flex-col bg-[var(--color-bg)] shadow-[var(--shadow-popover)] sm:w-[600px] sm:rounded-l-2xl motion-safe:animate-[sheetIn_200ms_var(--ease-out)]">
        <header className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
          {stack.length > 1 && (
            <button type="button" onClick={() => requestLeave('back')} aria-label="Назад"
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[0.8125rem] uppercase tracking-wide text-[var(--color-text-muted)]">
              {'newIn' in top ? `Новый юнит · ${top.newIn.name}` : KIND_LABEL[top.kind]}
            </div>
            <h2 className="truncate text-[1.25rem] font-semibold leading-[1.2] tracking-tight text-[var(--color-text)]">{title || ' '}</h2>
          </div>
          <button type="button" onClick={() => requestLeave('close')} aria-label="Закрыть"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer">
            <X size={20} />
          </button>
        </header>

        <RecordForm
          key={viewKey(top)}
          view={top}
          onDirty={setDirty}
          onTitle={rememberTitle}
          onOpen={open}
          onCreated={(newKind, newId) => { replaceTop({ kind: newKind, id: newId }); notify('Юнит добавлен. Теперь добавьте фото') }}
          notify={notify}
          askClose={askClose}
          onConfirmLeave={() => askClose && leave(askClose)}
          onCancelLeave={() => setAskClose(null)}
        />

        {toast && (
          <div role="status" className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-4">
            <div className="rounded-full bg-[var(--color-text)] px-4 py-2.5 text-[0.875rem] font-semibold text-white shadow-[var(--shadow-lift)] motion-safe:animate-[fadeIn_200ms_var(--ease-out)]">
              {toast}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RecordForm({
  view, onDirty, onTitle, onOpen, onCreated, notify, askClose, onConfirmLeave, onCancelLeave,
}: {
  view: View
  onDirty: (d: boolean) => void
  onTitle: (key: string, t: string) => void
  onOpen: (v: View) => void
  onCreated: (kind: 'villa' | 'apartment', id: string) => void
  notify: (msg: string) => void
  askClose: null | 'close' | 'back'
  onConfirmLeave: () => void
  onCancelLeave: () => void
}) {
  const router = useRouter()
  const isNew = 'newIn' in view
  const [data, setData] = useState<Payload | null>(null)
  const [values, setValues] = useState<Record<string, FieldValue>>({})
  const [changed, setChanged] = useState<Set<string>>(new Set())
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [fullOpen, setFullOpen] = useState(false)
  // Свежие значения для сравнения после ответа сервера (замыкание save видит старые).
  const valuesRef = useRef(values)
  useEffect(() => { valuesRef.current = values }, [values])
  const changedRef = useRef(changed)
  useEffect(() => { changedRef.current = changed }, [changed])
  const loadSeq = useRef(0)

  // keepValues: после сохранения поля уже показывают сохранённое — перечитываем
  // только остальное (список юнитов, заголовок), иначе ответ, пришедший позже
  // нового клика, затёр бы этот клик.
  const load = useCallback(async (keepValues = false) => {
    if ('newIn' in view) return
    const seq = ++loadSeq.current
    setLoadErr(null)
    try {
      const r = await fetch(`/api/page-edit/${view.kind}/${encodeURIComponent(view.id)}`)
      const j = await r.json()
      if (!r.ok) { if (!keepValues) setLoadErr(errorText(j.error)); return }
      if (seq !== loadSeq.current) return // пришёл ответ на устаревший запрос
      setData(j)
      // Поля, которые человек уже успел поменять, ответ сервера не трогает.
      if (!keepValues) setValues(prev => {
        const next = { ...j.values }
        for (const k of changedRef.current) next[k] = prev[k]
        return next
      })
      onTitle(viewKey(view), j.title)
    } catch { setLoadErr(errorText()) }
  }, [view, onTitle])

  useEffect(() => { void load() }, [load])
  useEffect(() => { onDirty(changed.size > 0) }, [changed, onDirty])

  const role: EditorRole = data?.role ?? 'staff'
  const sections = useMemo(() => SECTIONS[view.kind]
    .filter(s => !s.staffOnly || role === 'staff')
    .map(s => ({ ...s, fields: s.fields.filter(f => !f.staffOnly || role === 'staff') }))
    .filter(s => s.fields.length > 0), [view.kind, role])

  const set = (key: string, v: FieldValue) => {
    setValues(prev => ({ ...prev, [key]: v }))
    setChanged(prev => new Set(prev).add(key))
    setSaveErr(null)
  }

  const save = async () => {
    setSaving(true); setSaveErr(null)
    const payload: Record<string, FieldValue> = {}
    for (const k of changed) payload[k] = values[k]
    try {
      if ('newIn' in view) {
        const r = await fetch(`/api/page-edit/complex/${encodeURIComponent(view.newIn.id)}/units`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ unitKind: view.kind, values: payload }),
        })
        const j = await r.json()
        if (!r.ok) { setSaveErr(errorText(j.error)); return }
        setChanged(new Set())
        onCreated(view.kind, j.id)
        return
      }
      const r = await fetch(`/api/page-edit/${view.kind}/${encodeURIComponent(view.id)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ values: payload }),
      })
      const j = await r.json()
      if (!r.ok) { setSaveErr(errorText(j.error)); return }
      // Сбрасываем только то, что ушло на сервер: правка, сделанная во время
      // сохранения, остаётся несохранённой.
      setChanged(prev => new Set([...prev].filter(k => !(k in payload) || valuesRef.current[k] !== payload[k])))
      notify('Сохранено')
      router.refresh()
      void load(true)
    } catch {
      setSaveErr(errorText())
    } finally {
      setSaving(false)
    }
  }

  if (!isNew && !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        {loadErr ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-base text-[var(--color-text)]">{loadErr}</p>
            <button type="button" onClick={() => void load()}
              className="min-h-[44px] rounded-xl border border-[var(--color-border)] px-4 text-[0.875rem] font-semibold hover:bg-[var(--color-surface-alt)] cursor-pointer">
              Попробовать ещё раз
            </button>
          </div>
        ) : (
          <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" aria-label="Загрузка" />
        )}
      </div>
    )
  }

  const cfg = getCollection(COLLECTION_OF[view.kind])

  return (
    <>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-8 px-4 py-6 sm:px-6">
          {data?.complex && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-[var(--color-surface-alt)] px-3.5 py-3 text-[0.875rem] leading-[1.55] text-[var(--color-text-muted)]">
              <span>Район, точка на карте и срок сдачи - от ЖК</span>
              <button type="button" onClick={() => onOpen({ kind: 'complex', id: data.complex!.id })}
                className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline cursor-pointer">
                {data.complex.name} <ChevronRight size={14} aria-hidden />
              </button>
            </div>
          )}

          {isNew && (
            <p className="rounded-xl bg-[var(--color-surface-alt)] px-3.5 py-3 text-[0.875rem] leading-[1.55] text-[var(--color-text-muted)]">
              Заполните главное и нажмите «Создать». Название, район и точку на карте юнит возьмёт от ЖК, фото добавите следующим шагом.
            </p>
          )}

          {!isNew && data?.photos && (
            <Section title="Фото" hint="Первое фото - обложка. Сохраняются сразу.">
              <Photos kind={view.kind} id={(view as { id: string }).id} photos={data.photos}
                onChange={photos => setData(d => (d ? { ...d, photos } : d))} notify={notify} />
            </Section>
          )}

          {sections.map(s => (
            <Section key={s.id} title={s.title} hint={s.hint}>
              {s.fields.map(f => (
                <Field key={f.key} f={f} kind={view.kind} value={values[f.key] ?? null} onChange={v => set(f.key, v)} />
              ))}
            </Section>
          ))}

          {data && data.children.length > 0 || view.kind === 'complex' ? (
            <Section title={view.kind === 'developer' ? 'Комплексы' : 'Виллы и апартаменты'}
              hint={view.kind === 'complex' ? 'Нажмите на юнит, чтобы поменять цену, фото или скрыть его.' : undefined}>
              <Children items={data?.children ?? []} onOpen={c => onOpen({ kind: c.kind, id: c.id })} />
              {view.kind === 'complex' && data && (
                <div className="flex flex-wrap gap-2">
                  <AddButton onClick={() => onOpen({ kind: 'villa', newIn: { id: data.id, name: data.title } })}>Добавить виллу</AddButton>
                  <AddButton onClick={() => onOpen({ kind: 'apartment', newIn: { id: data.id, name: data.title } })}>Добавить апартаменты</AddButton>
                </div>
              )}
            </Section>
          ) : null}

          {role === 'staff' && view.kind === 'developer' && 'id' in view && (
            <Section title="Доступ застройщика"
              hint="Личная ссылка: по ней застройщик сам правит свою страницу и свои объекты. О каждой его правке придёт сообщение в Telegram. Новая ссылка отключает старую.">
              <InviteLink id={view.id} />
            </Section>
          )}

          {role === 'staff' && !isNew && cfg && (
            <button type="button" onClick={() => setFullOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 self-start text-[0.875rem] text-[var(--color-text-muted)] underline-offset-4 hover:text-[var(--color-text)] hover:underline cursor-pointer">
              <SlidersHorizontal size={16} aria-hidden /> Все поля записи (для опытных)
            </button>
          )}
        </div>
      </div>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
        {askClose ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-[0.875rem] text-[var(--color-text)]">Есть несохранённые изменения.</p>
            <div className="flex gap-2">
              <button type="button" onClick={onConfirmLeave}
                className="min-h-[48px] flex-1 rounded-xl border border-[var(--color-border)] px-4 text-[0.875rem] font-semibold text-red-700 hover:bg-red-50 cursor-pointer sm:flex-none">
                Не сохранять
              </button>
              <button type="button" onClick={onCancelLeave}
                className="min-h-[48px] flex-1 rounded-xl bg-[var(--color-primary)] px-4 text-[0.875rem] font-semibold text-white hover:bg-[var(--color-primary-hover)] cursor-pointer sm:flex-none">
                Вернуться
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {saveErr && <p role="alert" className="text-[0.875rem] text-red-700">{saveErr}</p>}
            <button type="button" onClick={save} disabled={saving || changed.size === 0}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-base font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-pressed)] disabled:bg-[var(--color-neutral-200)] disabled:text-[var(--color-text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] cursor-pointer disabled:cursor-default">
              {saving && <Loader2 size={18} className="animate-spin" aria-hidden />}
              {isNew ? 'Создать' : changed.size === 0 ? 'Изменений нет' : `Сохранить${changed.size > 1 ? ` (${changed.size})` : ''}`}
            </button>
          </div>
        )}
      </footer>

      {fullOpen && cfg && 'id' in view && (
        <div className="theme-admin theme-light" style={{ position: 'fixed', inset: 0, zIndex: 10001, isolation: 'isolate' }}>
          <RecordPanel cfg={cfg} id={view.id} title={data?.title ?? cfg.label}
            onClose={() => setFullOpen(false)}
            onSaved={() => { setFullOpen(false); void load(); router.refresh() }}
            onDeleted={() => { setFullOpen(false); router.push('/') }} />
        </div>
      )}
    </>
  )
}

function InviteLink({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle')
  const create = async () => {
    setState('busy')
    try {
      const r = await fetch(`/api/page-edit/developer/${encodeURIComponent(id)}/invite`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok || !j.url) { setState('error'); return }
      setUrl(j.url)
      await navigator.clipboard.writeText(j.url).then(() => setState('copied'), () => setState('idle'))
    } catch { setState('error') }
  }
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={create} disabled={state === 'busy'}
        className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-xl border border-[var(--color-border)] px-3.5 text-[0.875rem] font-semibold text-[var(--color-text)] transition-colors duration-[120ms] hover:bg-[var(--color-surface-alt)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer">
        {state === 'busy' && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {url ? 'Создать новую ссылку' : 'Создать ссылку для застройщика'}
      </button>
      {url && (
        <input readOnly value={url} onFocus={e => e.currentTarget.select()} aria-label="Ссылка для застройщика"
          className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-[0.8125rem] text-[var(--color-text)]" />
      )}
      {state === 'copied' && <p role="status" className="text-[0.8125rem] font-semibold text-[var(--color-primary)]">Скопировано - отправьте застройщику.</p>}
      {state === 'error' && <p role="alert" className="text-[0.8125rem] text-red-700">Не получилось создать ссылку. Попробуйте ещё раз.</p>}
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[1.25rem] font-semibold leading-[1.2] tracking-tight text-[var(--color-text)]">{title}</h3>
        {hint && <p className="max-w-[68ch] text-[0.8125rem] leading-[1.55] text-[var(--color-text-muted)]">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Children({ items, onOpen }: { items: Child[]; onOpen: (c: Child) => void }) {
  if (items.length === 0) {
    return <p className="text-[0.875rem] text-[var(--color-text-muted)]">Пока пусто.</p>
  }
  return (
    <ul className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)]">
      {items.map(c => (
        <li key={`${c.kind}:${c.id}`} className="border-b border-[var(--color-border)] last:border-b-0">
          <button type="button" onClick={() => onOpen(c)}
            className="flex min-h-[56px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-[120ms] hover:bg-[var(--color-surface-alt)] focus-visible:bg-[var(--color-surface-alt)] focus-visible:outline-none cursor-pointer">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.875rem] font-semibold text-[var(--color-text)]">{c.title}</span>
              {(c.subtitle || !c.published) && (
                <span className="block truncate text-[0.8125rem] text-[var(--color-text-muted)]">
                  {!c.published && <span className="text-[var(--color-brand)]">Скрыт · </span>}{c.subtitle}
                </span>
              )}
            </span>
            <ChevronRight size={18} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  )
}

function Photos({ kind, id, photos, onChange, notify }: {
  kind: EditKind; id: string; photos: string[]
  onChange: (p: string[]) => void; notify: (m: string) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const persist = async (next: string[]) => {
    const prev = photos
    onChange(next)
    const r = await fetch(`/api/page-edit/${kind}/${encodeURIComponent(id)}/photos`, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ photos: next }),
    }).catch(() => null)
    if (!r?.ok) { onChange(prev); setErr('Не получилось сохранить фото. Попробуйте ещё раз.'); return false }
    return true
  }

  const upload = async (files: File[]) => {
    if (!files.length) return
    setErr(null)
    const added: string[] = []
    for (const [i, file] of files.entries()) {
      setBusy(`Загружаю ${i + 1} из ${files.length}…`)
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch(`/api/page-edit/${kind}/upload`, { method: 'POST', body: fd }).catch(() => null)
      const j = r ? await r.json().catch(() => ({})) : {}
      if (r?.ok && j.url) added.push(j.url); else setErr(uploadError(j.error))
    }
    setBusy(null)
    if (added.length && await persist([...photos, ...added])) notify(added.length === 1 ? 'Фото добавлено' : `Добавлено фото: ${added.length}`)
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= photos.length) return
    const next = [...photos]; [next[i], next[j]] = [next[j], next[i]]
    void persist(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((u, i) => (
            <li key={u} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Фото ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[0.8125rem] font-semibold text-[var(--color-text)] shadow-[var(--shadow-card)]">
                  <Star size={12} aria-hidden /> Обложка
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/55 to-transparent p-1.5 pt-6">
                <div className="flex gap-1">
                  <PhotoBtn label="Левее" disabled={i === 0} onClick={() => move(i, -1)}><ArrowLeft size={16} /></PhotoBtn>
                  <PhotoBtn label="Правее" disabled={i === photos.length - 1} onClick={() => move(i, 1)}><ArrowRight size={16} /></PhotoBtn>
                </div>
                <PhotoBtn label="Удалить фото" danger onClick={() => void persist(photos.filter(x => x !== u)).then(ok => ok && notify('Фото удалено'))}>
                  <Trash2 size={16} />
                </PhotoBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); void upload([...e.dataTransfer.files].filter(f => f.type.startsWith('image/'))) }}
        disabled={!!busy}
        className={`flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-4 text-center transition-colors duration-[120ms] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${drag ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-neutral-300)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-alt)]'}`}>
        {busy ? <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" aria-hidden /> : <ImagePlus size={20} className="text-[var(--color-primary)]" aria-hidden />}
        <span className="text-[0.875rem] font-semibold text-[var(--color-text)]">{busy ?? 'Добавить фото'}</span>
        {!busy && <span className="text-[0.8125rem] text-[var(--color-text-muted)]">Нажмите или перетащите сюда, можно несколько сразу</span>}
      </button>
      {err && <p role="alert" className="text-[0.8125rem] text-red-700">{err}</p>}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { void upload([...(e.target.files ?? [])]); e.target.value = '' }} />
    </div>
  )
}

function PhotoBtn({ label, onClick, disabled, danger, children }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-[var(--color-text)] shadow-[var(--shadow-card)] transition-colors duration-[120ms] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer ${danger ? 'hover:bg-red-50 hover:text-red-700' : 'hover:bg-[var(--color-surface-alt)]'}`}>
      {children}
    </button>
  )
}
