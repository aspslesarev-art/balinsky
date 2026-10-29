'use client'

import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, GripVertical, Monitor, Plus, Smartphone, Trash2, X, MessageSquare } from 'lucide-react'
import type { Collection, CollectionItem, CollectionVisit } from '@/lib/collections'
import { useWishlist } from '@/components/WishlistContext'
import { useCurrency } from '@/components/CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { CopyLink } from './CopyLink'
import { durationRu, objectsRu, timesRu, whenRu } from './format'

// Экран подборки в кабинете агента. Слева — объекты (порядок
// перетаскиванием или стрелками, заметка клиенту, убрать), справа —
// ссылка, что смотрел клиент и история открытий.

const CARD = 'rounded-xl border border-[var(--color-border)] bg-white'
const BTN = 'flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-4 text-[14px] font-medium text-[var(--color-text)] transition-colors duration-[120ms] hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
const ICON_BTN = 'flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]'

// Адрес сайта для показа ссылки: на сервере — боевой, в браузере — текущий.
const noop = () => () => {}
const useHost = () => useSyncExternalStore(noop, () => location.host, () => 'balinsky.info')

const key = (i: { kind: string; slug: string }) => `${i.kind}:${i.slug}`
const href = (i: { kind: string; slug: string }) => `/ru/${i.kind === 'villa' ? 'villy' : 'apartamenty'}/o/${i.slug}`

async function send(url: string, method: string, body: unknown): Promise<boolean> {
  const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
  return !!r?.ok
}

export function CollectionEditor({ collection, initialItems, visits }: { collection: Collection; initialItems: CollectionItem[]; visits: CollectionVisit[] }) {
  const router = useRouter()
  const { currency } = useCurrency()
  const { items: wish, ready } = useWishlist()
  const [items, setItems] = useState(initialItems)
  const [title, setTitle] = useState(collection.title)
  const [intro, setIntro] = useState(collection.intro ?? '')
  const [active, setActive] = useState(collection.active)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toggling, setToggling] = useState(false)
  const drag = useRef<number | null>(null)
  const api = `/api/collections/${collection.id}`
  const host = useHost()

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(s => (s === msg ? null : s)), 2000) }
  const fail = () => setError('Не сохранилось. Проверьте интернет и попробуйте ещё раз.')

  async function saveMeta(patch: { title?: string; intro?: string; active?: boolean }) {
    setError(null)
    if (await send(api, 'PATCH', patch)) flash('Сохранено')
    else fail()
  }

  async function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return
    const next = items.slice()
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it)
    setItems(next)
    setError(null)
    if (!(await send(api, 'PATCH', { order: next.map(key) }))) fail()
  }

  async function remove(it: CollectionItem) {
    const before = items
    setItems(items.filter(x => key(x) !== key(it)))
    if (!(await send(`${api}/items`, 'DELETE', { kind: it.kind, slug: it.slug }))) { setItems(before); fail() }
  }

  async function saveNote(it: CollectionItem) {
    const note = noteText.trim()
    if (!(await send(`${api}/items`, 'PATCH', { kind: it.kind, slug: it.slug, note }))) { fail(); return }
    setItems(items.map(x => (key(x) === key(it) ? { ...x, note: note || null } : x)))
    setNoteFor(null)
  }

  const fromWish = useMemo(() => {
    const have = new Set(items.map(key))
    return wish.filter(w => (w.kind === 'villa' || w.kind === 'apartment') && !have.has(key(w)))
  }, [wish, items])

  async function importWishlist() {
    setImporting(true)
    setError(null)
    const ok = await Promise.all(fromWish.map(w => send(`${api}/items`, 'POST', {
      kind: w.kind, slug: w.slug,
      snapshot: { title: w.title, photo: w.photo, priceUsd: w.priceUsd, district: w.district, bedrooms: w.bedrooms, area: w.area ?? null, leaseYears: w.leaseYears ?? null, status: w.status ?? null },
    })))
    setImporting(false)
    if (ok.some(x => !x)) fail()
    setItems(cur => [...cur, ...fromWish.filter((_, i) => ok[i]).map((w, i) => ({
      kind: w.kind as 'villa' | 'apartment', slug: w.slug, position: cur.length + i, note: null,
      snapshot: { title: w.title, photo: w.photo, priceUsd: w.priceUsd, district: w.district, bedrooms: w.bedrooms, area: w.area ?? null, leaseYears: w.leaseYears ?? null, status: w.status ?? null },
    }))])
  }

  async function del() {
    if (await send(api, 'DELETE', {})) router.push('/kabinet/podborki')
    else fail()
  }

  // Клиентские заходы без предпросмотров мессенджеров.
  const real = visits.filter(v => !v.preview)
  const devices = new Set(real.map(v => v.visitor)).size
  const views = items.map(it => ({ it, n: real.filter(v => v.viewed.includes(key(it))).length }))
  const maxViews = Math.max(1, ...views.map(v => v.n))

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-[1184px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:py-12">
      <section className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/kabinet/podborki" className="self-start text-[14px] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)]">← Все подборки</Link>
          <label htmlFor="c-title" className="sr-only">Название подборки</label>
          <input id="c-title" value={title} maxLength={120} onChange={e => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title.trim() !== collection.title) saveMeta({ title: title.trim() }) }}
            className="w-full rounded-lg border border-transparent bg-transparent px-1 -mx-1 text-[28px] font-semibold leading-tight tracking-tight hover:border-[var(--color-border)] focus-visible:border-[var(--color-border)] focus-visible:bg-white focus-visible:outline-none sm:text-[32px]" />
          <label htmlFor="c-intro" className="mt-2 text-[14px] text-[var(--color-text-muted)]">Пара слов клиенту - увидит над объектами</label>
          <textarea id="c-intro" rows={2} value={intro} maxLength={1000} onChange={e => setIntro(e.target.value)}
            onBlur={() => { if (intro.trim() !== (collection.intro ?? '')) saveMeta({ intro: intro.trim() }) }}
            placeholder="Например: собрал виллы рядом с океаном, которые сдаются круглый год"
            className="resize-y rounded-lg border border-[var(--color-border)] bg-white p-3 text-[15px] leading-relaxed focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[20px] font-semibold">{objectsRu(items.length)}</h2>
          {items.length > 1 && <span className="hidden text-[14px] text-[var(--color-text-muted)] md:inline">Перетащите, чтобы поменять порядок</span>}
          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            <Link href="/ru/villy" className={`${BTN} no-underline`}><Plus size={16} aria-hidden /> Добавить из каталога</Link>
            {ready && fromWish.length > 0 && (
              <button type="button" onClick={importWishlist} disabled={importing} className={BTN}>
                {importing ? 'Переношу…' : `Перенести из «Избранного» (${fromWish.length})`}
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#C9D2CE] px-6 py-12 text-center">
            <h3 className="text-[16px] font-semibold">Пока пусто</h3>
            <p className="max-w-[440px] text-[14px] leading-relaxed text-[var(--color-text-muted)]">
              Откройте виллу или апартаменты в каталоге и нажмите «В подборку» рядом с ценой.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {items.map((it, i) => {
              const s = it.snapshot
              const meta = [s.district, s.bedrooms ? `${s.bedrooms} сп.` : null, s.area ? `${s.area} м²` : null].filter(Boolean).join(' · ')
              return (
                <li key={key(it)} draggable
                  onDragStart={() => { drag.current = i }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (drag.current != null) move(drag.current, i); drag.current = null }}
                  className={`${CARD} flex flex-col gap-3 p-3`}>
                  <div className="flex items-center gap-3">
                    <GripVertical size={18} className="hidden shrink-0 cursor-grab text-[#A3ADA8] md:block" aria-hidden />
                    {s.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- превью из снимка объекта
                      <img src={s.photo} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover sm:h-20 sm:w-[120px]" />
                    ) : <span className="h-16 w-24 shrink-0 rounded-lg bg-[var(--color-search-bg)] sm:h-20 sm:w-[120px]" aria-hidden />}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link href={href(it)} className="line-clamp-2 text-[15px] font-semibold leading-snug sm:text-[16px] md:truncate md:leading-normal text-[var(--color-text)] no-underline hover:underline">{s.title}</Link>
                      {meta && <span className="truncate text-[14px] text-[var(--color-text-muted)]">{meta}</span>}
                      {s.priceUsd != null && <span className="text-[15px] font-semibold">{formatPrice(s.priceUsd, currency, 'ru')}</span>}
                    </div>
                    <div className="flex shrink-0 flex-col sm:flex-row">
                      <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Выше" className={ICON_BTN}><ArrowUp size={16} aria-hidden /></button>
                      <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label="Ниже" className={ICON_BTN}><ArrowDown size={16} aria-hidden /></button>
                    </div>
                    <button type="button" onClick={() => remove(it)} aria-label={`Убрать «${s.title}» из подборки`} className={ICON_BTN}><X size={18} aria-hidden /></button>
                  </div>
                  {noteFor === key(it) ? (
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`note-${i}`} className="sr-only">Заметка для клиента</label>
                      <textarea id={`note-${i}`} autoFocus rows={2} maxLength={500} value={noteText} onChange={e => setNoteText(e.target.value)}
                        placeholder="Например: смотреть первой - лучший вид"
                        className="rounded-lg border border-[var(--color-border)] p-3 text-[15px] leading-relaxed focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => saveNote(it)} className="h-10 cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--color-primary-hover)]">Сохранить</button>
                        <button type="button" onClick={() => setNoteFor(null)} className="h-10 cursor-pointer rounded-lg px-4 text-[14px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]">Отмена</button>
                      </div>
                    </div>
                  ) : it.note ? (
                    <button type="button" onClick={() => { setNoteFor(key(it)); setNoteText(it.note ?? '') }}
                      className="cursor-pointer rounded-lg bg-[var(--color-primary-soft)] px-3 py-2 text-left text-[14px] leading-relaxed text-[var(--color-primary-pressed)] hover:opacity-90">
                      «{it.note}» <span className="text-[13px] underline">изменить</span>
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setNoteFor(key(it)); setNoteText('') }}
                      className="flex cursor-pointer items-center gap-1 self-start rounded px-1 py-1 text-[14px] text-[var(--color-primary)] hover:underline">
                      <MessageSquare size={14} aria-hidden /> Заметка для клиента
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        {error && <p role="alert" className="text-[14px] text-[#8A1F14]">{error}</p>}
      </section>

      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
        <div className={`${CARD} flex flex-col gap-4 p-6`}>
          <div className="flex items-baseline gap-2">
            <h2 className="text-[17px] font-semibold">Ссылка для клиента</h2>
            {saved && <span role="status" className="ml-auto text-[13px] text-[var(--color-primary-pressed)]">{saved}</span>}
          </div>
          <p className="truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-3 text-[14px]">{host}/p/{collection.token}</p>
          <div className="flex"><CopyLink token={collection.token} variant="primary" /></div>
          <a href={`/p/${collection.token}?preview=1`} target="_blank" rel="noopener" className={`${BTN} justify-center no-underline`}>Как видит клиент</a>
          <label className="flex cursor-pointer items-start gap-3 border-t border-[var(--color-border)] pt-4 text-[14px] leading-snug">
            <input type="checkbox" checked={active} disabled={toggling}
              onChange={async e => {
                // Пока прошлое переключение не сохранилось, второе не шлём — иначе ответы придут не по порядку.
                const on = e.target.checked
                setActive(on); setToggling(true)
                await saveMeta({ active: on })
                setToggling(false)
              }}
              className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--color-primary)]" />
            <span className="flex flex-col gap-0.5">
              <span>Ссылка работает</span>
              <span className="text-[13px] text-[var(--color-text-muted)]">Выключите - клиент увидит «подборка закрыта»</span>
            </span>
          </label>
        </div>

        <div className={`${CARD} flex flex-col gap-4 p-6`}>
          <div className="flex items-baseline gap-2">
            <h2 className="text-[17px] font-semibold">Что смотрел клиент</h2>
            <span className="ml-auto text-[14px] text-[var(--color-text-muted)]">{real.length ? timesRu(real.length) : ''}</span>
          </div>
          {real.length === 0 ? (
            <p className="text-[14px] leading-relaxed text-[var(--color-text-muted)]">Клиент ещё не открывал ссылку. Когда откроет - бот напишет вам в Telegram.</p>
          ) : (
            <>
              <p className="text-[14px] text-[var(--color-text-muted)]">Последний раз - {whenRu(real[0].startedAt)}, {real[0].device}</p>
              <ul className="flex flex-col gap-3">
                {views.map(({ it, n }) => (
                  <li key={key(it)} className="flex flex-col gap-1">
                    <div className="flex gap-2 text-[14px]">
                      <span className="truncate">{it.snapshot.title}</span>
                      <span className="ml-auto shrink-0 text-[var(--color-text-muted)]">{n ? `открыл ${timesRu(n)}` : 'не открывал'}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div className="h-1.5 rounded-full bg-[var(--color-primary)]" style={{ width: `${(n / maxViews) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className={`${CARD} flex flex-col gap-2 p-6`}>
          <div className="flex items-baseline gap-2 pb-2">
            <h2 className="text-[17px] font-semibold">История открытий</h2>
            {devices > 0 && <span className="ml-auto text-[14px] text-[var(--color-text-muted)]">{devices === 1 ? '1 устройство' : `${devices} ${devices < 5 ? 'устройства' : 'устройств'}`}</span>}
          </div>
          {visits.length === 0 ? (
            <p className="text-[14px] text-[var(--color-text-muted)]">Пока пусто.</p>
          ) : (
            <ol className="flex flex-col">
              {visits.slice(0, 30).map(v => {
                const phone = /iPhone|Android|iPad/.test(v.device ?? '')
                const place = [v.country, v.city].filter(Boolean).join(', ')
                return (
                  <li key={v.id} className="flex gap-3 border-t border-[var(--color-border)] py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-alt)]" aria-hidden>
                      {phone ? <Smartphone size={18} /> : <Monitor size={18} />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[14px] font-semibold">{whenRu(v.startedAt)}</span>
                      <span className="text-[14px]">{[v.device, v.browser].filter(Boolean).join(', ')}</span>
                      {!v.preview && (
                        <span className="text-[13px] text-[var(--color-text-muted)]">
                          Смотрел {durationRu(v.startedAt, v.lastSeenAt)}{v.viewed.length ? `, открыл ${objectsRu(v.viewed.length)}` : ''}
                        </span>
                      )}
                      <span className="text-[13px] text-[var(--color-text-muted)]">{v.preview ? `${place || 'сервер мессенджера'} · не клиент` : place || 'страна не определилась'}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
          <p className="pt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">Страна и город - примерно, по адресу в интернете. Через VPN покажет страну VPN.</p>
        </div>

        <div className="flex justify-end">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-[14px]">
              <span>Удалить подборку и ссылку?</span>
              <button type="button" onClick={del} className="h-10 cursor-pointer rounded-lg bg-[#8A1F14] px-4 font-semibold text-white">Удалить</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 cursor-pointer rounded-lg px-3 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]">Нет</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-[14px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[#8A1F14]">
              <Trash2 size={16} aria-hidden /> Удалить подборку
            </button>
          )}
        </div>
      </aside>
    </main>
  )
}
