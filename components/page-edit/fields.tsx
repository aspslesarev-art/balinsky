'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ExternalLink, Loader2, MapPin, Plus, Upload, X } from 'lucide-react'
import type { EditField, EditKind } from '@/lib/page-edit/schema'
import { isShortMapsLink, mapsUrl, parseCoords, type LatLng } from '@/lib/page-edit/geo'

// Поля человеческой формы правки. Ввод — по смыслу поля, а не по типу в базе:
// варианты кнопками, список пунктов строками, точка карты ссылкой.

export type FieldValue = string | number | boolean | string[] | (LatLng & { link?: string }) | null

const inputCls =
  'w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base text-[var(--color-text)] ' +
  'placeholder:text-[var(--color-neutral-400)] transition-colors duration-[120ms] hover:border-[var(--color-neutral-300)] ' +
  'focus:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-soft)] disabled:opacity-50'

const chipCls = (on: boolean) =>
  'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-[0.875rem] transition-colors duration-[120ms] cursor-pointer ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ' +
  (on
    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] font-semibold'
    : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-neutral-300)] hover:bg-[var(--color-surface-alt)]')

export function FieldShell({ f, htmlFor, children }: { f: EditField; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {f.input !== 'toggle' && (
        <label htmlFor={htmlFor} className="text-[0.875rem] font-semibold text-[var(--color-text)]">
          {f.label}
        </label>
      )}
      {children}
      {f.hint && <p className="text-[0.8125rem] leading-[1.55] text-[var(--color-text-muted)]">{f.hint}</p>}
    </div>
  )
}

type FieldProps = {
  f: EditField
  kind: EditKind
  value: FieldValue
  onChange: (v: FieldValue) => void
}

export function Field(props: FieldProps) {
  const id = useId()
  const { f, value, onChange } = props
  switch (f.input) {
    case 'toggle': return <ToggleField {...props} />
    case 'choice': return <FieldShell f={f}><ChoiceField {...props} /></FieldShell>
    case 'chips': return <FieldShell f={f}><ChipsField {...props} /></FieldShell>
    case 'list': return <FieldShell f={f}><ListField {...props} /></FieldShell>
    case 'percent': return <FieldShell f={f} htmlFor={id}><PercentField {...props} id={id} /></FieldShell>
    case 'map': return <FieldShell f={f} htmlFor={id}><MapField {...props} id={id} /></FieldShell>
    case 'image': return <FieldShell f={f}><ImageField {...props} /></FieldShell>
    case 'textarea':
      return (
        <FieldShell f={f} htmlFor={id}>
          <AutoTextarea id={id} value={typeof value === 'string' ? value : ''} onChange={onChange} placeholder={f.placeholder} />
        </FieldShell>
      )
    case 'number':
    case 'money':
      return <FieldShell f={f} htmlFor={id}><NumberField {...props} id={id} /></FieldShell>
    default:
      return (
        <FieldShell f={f} htmlFor={id}>
          <input id={id} type="text" className={inputCls} value={typeof value === 'string' ? value : value == null ? '' : String(value)}
            placeholder={f.placeholder} onChange={e => onChange(e.target.value)} />
        </FieldShell>
      )
  }
}

function ToggleField({ f, value, onChange }: FieldProps) {
  const on = value === true
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
        className="flex min-h-[48px] w-full items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] px-3.5 text-left transition-colors duration-[120ms] hover:bg-[var(--color-surface-alt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] cursor-pointer"
      >
        <span className="text-[0.875rem] font-semibold text-[var(--color-text)]">{f.label}</span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-[120ms] ${on ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-neutral-300)]'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-[var(--shadow-card)] transition-transform duration-[120ms] ${on ? 'translate-x-6' : 'translate-x-1'}`} />
        </span>
      </button>
      {f.hint && <p className="text-[0.8125rem] leading-[1.55] text-[var(--color-text-muted)]">{f.hint}</p>}
    </div>
  )
}

function ChoiceField({ f, value, onChange }: FieldProps) {
  const current = typeof value === 'string' ? value : value == null ? '' : String(value)
  const options = f.options ?? []
  const custom = current && !options.includes(current)
  const [other, setOther] = useState(custom)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} type="button" aria-pressed={current === o}
            onClick={() => { setOther(false); onChange(current === o ? '' : o) }}
            className={chipCls(current === o)}>
            {current === o && <Check size={14} aria-hidden />}{o}
          </button>
        ))}
        <button type="button" aria-pressed={!!other} onClick={() => setOther(v => !v)} className={chipCls(!!other)}>
          {custom ? current : 'Другое'}
        </button>
      </div>
      {other && (
        <input type="text" className={inputCls} autoFocus value={custom ? current : ''}
          placeholder="Впишите свой вариант" onChange={e => onChange(e.target.value)} />
      )}
    </div>
  )
}

function ChipsField({ f, value, onChange }: FieldProps) {
  const selected = Array.isArray(value) ? value : []
  const options = [...new Set([...(f.options ?? []), ...selected])]
  const toggle = (o: string) => onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" aria-pressed={selected.includes(o)} onClick={() => toggle(o)} className={chipCls(selected.includes(o))}>
          {selected.includes(o) && <Check size={14} aria-hidden />}{o}
        </button>
      ))}
    </div>
  )
}

function ListField({ f, value, onChange }: FieldProps) {
  const items = Array.isArray(value) ? value : []
  // Пустая строка в конце — место для нового пункта; в значение не попадает.
  const rows = [...items, '']
  const refs = useRef<(HTMLTextAreaElement | null)[]>([])
  const [focusIdx, setFocusIdx] = useState<number | null>(null)

  useEffect(() => {
    if (focusIdx != null) { refs.current[focusIdx]?.focus(); setFocusIdx(null) }
  }, [focusIdx])

  const set = (i: number, text: string) => {
    const next = [...items]
    if (i === items.length) next.push(text); else next[i] = text
    onChange(next.filter((s, idx) => s.trim() !== '' || idx === i))
  }
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-2">
      {rows.map((text, i) => {
        const isNew = i === items.length
        return (
          <div key={i} className="flex items-start gap-2">
            <span aria-hidden className={`mt-[19px] h-1.5 w-1.5 shrink-0 rounded-full ${isNew ? 'bg-[var(--color-neutral-300)]' : 'bg-[var(--color-primary)]'}`} />
            <textarea
              ref={el => { refs.current[i] = el; fitHeight(el) }}
              rows={1} className={`${inputCls} resize-none leading-[1.55]`} value={text}
              placeholder={isNew ? (items.length ? 'Ещё пункт' : f.placeholder ?? 'Первый пункт') : undefined}
              onChange={e => { fitHeight(e.target); set(i, e.target.value.replace(/\n+/g, ' ')) }}
              onBlur={() => { if (!isNew && !text.trim()) remove(i) }}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); if (text.trim()) setFocusIdx(isNew ? items.length + 1 : i + 1) }
                if (e.key === 'Backspace' && !text && !isNew) { e.preventDefault(); remove(i); setFocusIdx(Math.max(0, i - 1)) }
              }}
            />
            {!isNew ? (
              <button type="button" onClick={() => remove(i)} aria-label="Убрать пункт"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors duration-[120ms] hover:bg-[var(--color-surface-alt)] hover:text-red-600 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer">
                <X size={18} />
              </button>
            ) : <span className="w-11 shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}

// Высота по тексту: длинный пункт переносится, а не уезжает за край.
function fitHeight(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight + 2}px`
}

function PercentField({ value, onChange, id }: FieldProps & { id: string }) {
  const n = typeof value === 'number' ? value : null
  return (
    <div className="flex items-center gap-4">
      <input id={id} type="range" min={0} max={100} step={5} value={n ?? 0}
        onChange={e => onChange(Number(e.target.value))}
        className="h-11 flex-1 accent-[var(--color-primary)] cursor-pointer" aria-valuetext={`${n ?? 0}%`} />
      <div className="relative w-24 shrink-0">
        <input type="number" inputMode="numeric" min={0} max={100} className={`${inputCls} pr-8 text-right`}
          value={n ?? ''} onChange={e => onChange(e.target.value === '' ? null : Math.max(0, Math.min(100, Number(e.target.value))))} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">%</span>
      </div>
    </div>
  )
}

const fmtMoney = (n: number | null) => (n == null ? '' : n.toLocaleString('ru-RU').replace(/ /g, ' '))

function NumberField({ f, value, onChange, id }: FieldProps & { id: string }) {
  const n = typeof value === 'number' ? value : null
  const money = f.input === 'money'
  const [text, setText] = useState(money ? fmtMoney(n) : n == null ? '' : String(n))
  useEffect(() => { setText(money ? fmtMoney(n) : n == null ? '' : String(n)) }, [n, money])
  return (
    <div className="relative">
      {money && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">$</span>}
      <input
        id={id} type="text" inputMode={money ? 'numeric' : 'decimal'}
        className={`${inputCls} ${money ? 'pl-7' : ''} ${f.suffix && !money ? 'pr-24' : ''}`}
        value={text} placeholder={f.placeholder}
        onChange={e => {
          const raw = e.target.value
          const clean = money ? raw.replace(/[^\d]/g, '') : raw.replace(',', '.').replace(/[^\d.]/g, '')
          if (clean === '') { setText(''); onChange(null); return }
          const num = Number(clean)
          if (!Number.isFinite(num)) return
          setText(money ? fmtMoney(num) : clean)
          onChange(num)
        }}
      />
      {f.suffix && !money && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.875rem] text-[var(--color-text-muted)]">{f.suffix}</span>
      )}
    </div>
  )
}

function AutoTextarea({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight + 2, 560)}px`
  }, [value])
  return (
    <textarea ref={ref} id={id} rows={5} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`${inputCls} resize-y leading-[1.6]`} />
  )
}

function MapField({ value, onChange, id }: FieldProps & { id: string }) {
  const point = value && typeof value === 'object' && !Array.isArray(value) ? value as LatLng : null
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')

  const resolve = async (input: string) => {
    const s = input.trim()
    if (!s) return
    // Ссылку, которую вставил человек, сохраняем как есть — она открывает
    // карточку места, а не голую точку.
    const link = /^https:\/\//i.test(s) ? s : undefined
    const local = parseCoords(s)
    if (local) { onChange({ ...local, link }); setText(''); setState('idle'); return }
    if (!isShortMapsLink(s)) { setState('error'); return }
    setState('busy')
    try {
      const r = await fetch(`/api/page-edit/geo?url=${encodeURIComponent(s)}`)
      const j = await r.json()
      if (r.ok && typeof j.lat === 'number') { onChange({ lat: j.lat, lng: j.lng, link }); setText(''); setState('idle') }
      else setState('error')
    } catch { setState('error') }
  }

  return (
    <div className="flex flex-col gap-2">
      {point ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-3.5 py-3">
          <MapPin size={18} className="shrink-0 text-[var(--color-primary)]" aria-hidden />
          <span className="text-[0.875rem] font-semibold text-[var(--color-text)]">Точка стоит</span>
          <span className="text-[0.8125rem] tabular-nums text-[var(--color-text-muted)]">{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</span>
          <a href={mapsUrl(point)} target="_blank" rel="noopener noreferrer"
            className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 text-[0.875rem] font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline">
            Проверить на карте <ExternalLink size={14} aria-hidden />
          </a>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--color-neutral-300)] px-3.5 py-3 text-[0.875rem] text-[var(--color-text-muted)]">
          Точки нет - без неё на странице не будет карты и «Как добраться».
        </div>
      )}
      <div className="flex gap-2">
        <input
          id={id} type="url" inputMode="url" className={inputCls} value={text}
          placeholder={point ? 'Новая ссылка, если точка неверна' : 'Вставьте ссылку из Google Maps'}
          onChange={e => { setText(e.target.value); setState('idle') }}
          onPaste={e => { const t = e.clipboardData.getData('text'); if (t) { e.preventDefault(); setText(t); void resolve(t) } }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void resolve(text) } }}
        />
        <button type="button" onClick={() => resolve(text)} disabled={!text.trim() || state === 'busy'}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3.5 text-[0.875rem] font-semibold text-[var(--color-text)] transition-colors duration-[120ms] hover:bg-[var(--color-surface-alt)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer">
          {state === 'busy' ? <Loader2 size={16} className="animate-spin" /> : 'Поставить'}
        </button>
      </div>
      {state === 'error' && (
        <p role="alert" className="text-[0.8125rem] text-red-700">
          Не нашёл в ссылке точку на Бали. Откройте место в Google Maps → «Поделиться» → «Копировать ссылку».
        </p>
      )}
      {point && (
        <button type="button" onClick={() => onChange(null)}
          className="self-start text-[0.8125rem] text-[var(--color-text-muted)] underline-offset-4 hover:text-red-700 hover:underline cursor-pointer">
          Убрать точку
        </button>
      )}
    </div>
  )
}

function ImageField({ kind, value, onChange }: FieldProps) {
  const url = typeof value === 'string' ? value : ''
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = async (file: File) => {
    setBusy(true); setErr(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch(`/api/page-edit/${kind}/upload`, { method: 'POST', body: fd })
      const j = await r.json()
      if (r.ok && j.url) onChange(j.url); else setErr(uploadError(j.error))
    } catch { setErr(uploadError()) } finally { setBusy(false) }
  }
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="Логотип" className="h-full w-full object-contain" /> : <span className="text-[0.8125rem] text-[var(--color-text-muted)]">нет</span>}
      </div>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--color-border)] px-3.5 text-[0.875rem] font-semibold text-[var(--color-text)] transition-colors duration-[120ms] hover:bg-[var(--color-surface-alt)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} aria-hidden />} {url ? 'Заменить' : 'Загрузить'}
        </button>
        {err && <p role="alert" className="text-[0.8125rem] text-red-700">{err}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const fl = e.target.files?.[0]; if (fl) void upload(fl); e.target.value = '' }} />
    </div>
  )
}

export function uploadError(code?: string): string {
  if (code === 'not_an_image') return 'Это не фото. Подходят JPG, PNG, WEBP, HEIC.'
  if (code === 'too_big') return 'Фото больше 15 МБ - уменьшите и попробуйте снова.'
  if (code === 'unauthorized') return 'Нет доступа - войдите заново.'
  return 'Не получилось загрузить. Попробуйте ещё раз.'
}

export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-dashed border-[var(--color-neutral-300)] px-3.5 text-[0.875rem] font-semibold text-[var(--color-primary)] transition-colors duration-[120ms] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] cursor-pointer">
      <Plus size={16} aria-hidden /> {children}
    </button>
  )
}
