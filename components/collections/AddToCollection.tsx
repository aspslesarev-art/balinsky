'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ListPlus, Check, X, Plus } from 'lucide-react'
import type { ItemSnapshot } from '@/lib/collections'
import { objectsRu } from './format'

// Кнопка «В подборку» на странице виллы или апартаментов (Pro, макет
// https://claude.ai/artifact/TEUDdpFWhCUY4aDcWN3N5K, экраны 3–4). На
// компьютере — окошко под кнопкой, на телефоне — шторка снизу. Галочка
// сразу добавляет или убирает объект, без кнопки «Сохранить».

type List = { id: string; title: string; count: number; has: boolean }

// Кнопка живёт на всех языковых версиях страницы; кабинет подборок пока только
// на русском, поэтому кроме RU — один английский текст на все языки.
const COPY = {
  ru: {
    button: 'В подборку', heading: 'Добавить в подборку', close: 'Закрыть',
    loadErr: 'Не получилось загрузить подборки. Попробуйте ещё раз.', saveErr: 'Не сохранилось. Попробуйте ещё раз.',
    createErr: 'Не получилось создать подборку.', loading: 'Загружаю подборки…',
    empty: 'Подборок пока нет. Напишите имя клиента ниже - создам и сразу положу этот объект.',
    saving: ' · сохраняю…', added: 'добавлено', newLabel: 'Название новой подборки',
    newPh: 'Новая подборка - имя клиента', create: 'Создать', all: 'Все подборки →',
    toast: (t: string) => `Добавлено в «${t}»`, open: 'Открыть', count: objectsRu,
  },
  en: {
    button: 'Add to collection', heading: 'Add to collection', close: 'Close',
    loadErr: "Couldn't load collections. Please try again.", saveErr: "Couldn't save. Please try again.",
    createErr: "Couldn't create the collection.", loading: 'Loading collections…',
    empty: "No collections yet. Type a client's name below - I'll create one and add this property.",
    saving: ' · saving…', added: 'added', newLabel: 'New collection name',
    newPh: "New collection - client's name", create: 'Create', all: 'All collections →',
    toast: (t: string) => `Added to “${t}”`, open: 'Open',
    count: (n: number) => `${n} ${n === 1 ? 'property' : 'properties'}`,
  },
}

export function AddToCollection({ kind, slug, snapshot, lang = 'ru' }: { kind: 'villa' | 'apartment'; slug: string; snapshot: ItemSnapshot; lang?: string }) {
  const c = lang === 'ru' ? COPY.ru : COPY.en
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<List[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [toast, setToast] = useState<{ id: string; title: string } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let off = false
    setError(null)
    fetch(`/api/collections?kind=${kind}&slug=${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { lists: List[] }) => { if (!off) setLists(d.lists) })
      .catch(() => { if (!off) setError(c.loadErr) })
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const outside = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', esc)
    window.addEventListener('mousedown', outside)
    return () => { off = true; window.removeEventListener('keydown', esc); window.removeEventListener('mousedown', outside) }
  }, [open, kind, slug])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  async function toggle(l: List) {
    setBusy(l.id)
    setError(null)
    const r = await fetch(`/api/collections/${l.id}/items`, {
      method: l.has ? 'DELETE' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, slug, snapshot }),
    }).catch(() => null)
    setBusy(null)
    if (!r?.ok) { setError(c.saveErr); return }
    setLists(ls => ls?.map(x => (x.id === l.id ? { ...x, has: !l.has, count: x.count + (l.has ? -1 : 1) } : x)) ?? ls)
    if (!l.has) setToast({ id: l.id, title: l.title })
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const title = name.trim()
    if (!title) return
    setBusy('new')
    setError(null)
    const r = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, item: { kind, slug, snapshot } }),
    }).catch(() => null)
    setBusy(null)
    if (!r?.ok) { setError(c.createErr); return }
    const { collection } = await r.json() as { collection: { id: string; title: string } }
    setLists(ls => [{ id: collection.id, title: collection.title, count: 1, has: true }, ...(ls ?? [])])
    setName('')
    setToast({ id: collection.id, title: collection.title })
  }

  const panel = (
    <>
      <div className="flex items-center gap-2 pb-2">
        <h2 className="text-[16px] font-semibold">{c.heading}</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label={c.close}
          className="ml-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">
          <X size={18} aria-hidden />
        </button>
      </div>
      {lists == null && !error && <p className="py-4 text-[14px] text-[var(--color-text-muted)]">{c.loading}</p>}
      {lists?.length === 0 && <p className="pb-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">{c.empty}</p>}
      <ul className="flex max-h-[300px] flex-col gap-1 overflow-y-auto">
        {lists?.map(l => (
          <li key={l.id}>
            <button type="button" onClick={() => toggle(l)} disabled={busy != null} aria-pressed={l.has}
              className={`flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left transition-colors duration-[120ms] disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${l.has ? 'bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--color-surface-alt)]'}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${l.has ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[#B5BFBA] bg-white'}`} aria-hidden>
                {l.has && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium">{l.title}</span>
                <span className="text-[13px] text-[var(--color-text-muted)]">{c.count(l.count)}{busy === l.id ? c.saving : ''}</span>
              </span>
              {l.has && <span className="text-[13px] text-[var(--color-primary-pressed)]">{c.added}</span>}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={create} className="mt-2 flex gap-2 border-t border-[var(--color-border)] pt-3">
        <label htmlFor={`newlist-${slug}`} className="sr-only">{c.newLabel}</label>
        <input id={`newlist-${slug}`} value={name} onChange={e => setName(e.target.value)} maxLength={120}
          placeholder={c.newPh}
          className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] px-3 text-[15px] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" />
        <button type="submit" disabled={!name.trim() || busy != null}
          className="flex h-11 cursor-pointer items-center gap-1 rounded-lg bg-[var(--color-primary-soft)] px-4 text-[14px] font-semibold text-[var(--color-primary-pressed)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">
          <Plus size={16} aria-hidden /> {c.create}
        </button>
      </form>
      {error && <p role="alert" className="pt-2 text-[14px] text-[#8A1F14]">{error}</p>}
      <Link href="/kabinet/podborki" className="pt-3 text-[14px]">{c.all}</Link>
    </>
  )

  return (
    <div ref={box} className="relative md:w-auto">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex min-h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[var(--color-primary)] bg-white px-4 text-[15px] font-semibold text-[var(--color-primary-pressed)] transition-colors duration-[120ms] hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
        <ListPlus size={18} strokeWidth={2} aria-hidden /> {c.button}
      </button>
      {open && (
        <>
          {/* Телефон: шторка снизу на затемнении. */}
          <div className="fixed inset-0 z-50 bg-[rgb(15_26_21/.45)] md:hidden" aria-hidden onClick={() => setOpen(false)} />
          <div role="dialog" aria-label={c.heading}
            className="fixed inset-x-0 bottom-0 z-50 flex max-w-none flex-col rounded-t-2xl bg-white px-4 pb-8 pt-3 md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-[calc(100%+8px)] md:w-[400px] md:rounded-xl md:border md:border-[var(--color-border)] md:p-4 md:shadow-[0_1px_2px_rgb(0_0_0/.04),0_12px_32px_rgb(0_0_0/.10)]">
            <span className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--color-border)] md:hidden" aria-hidden />
            {panel}
          </div>
        </>
      )}
      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[60] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-xl bg-[var(--color-text)] px-4 py-3 text-[14px] text-white shadow-[0_1px_2px_rgb(0_0_0/.04),0_8px_24px_rgb(0_0_0/.12)]">
          <Check size={18} strokeWidth={2.5} className="shrink-0 text-[#7FD1A8]" aria-hidden />
          <span className="truncate">{c.toast(toast.title)}</span>
          <Link href={`/kabinet/podborki/${toast.id}`} className="shrink-0 font-semibold text-[#7FD1A8] no-underline">{c.open}</Link>
        </div>
      )}
    </div>
  )
}
