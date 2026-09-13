'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { DayRow } from '@/lib/meetings/store'
import type { District, MeetingBooking, MeetingSettings } from '@/lib/meetings/types'

const PUBLIC_LINKS = [
  { label: 'RU', url: 'https://balinsky.info/vstrecha' },
  { label: 'EN', url: 'https://balinsky.info/en/meeting' },
]
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const panel = 'rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-4 md:p-6'
const input = 'h-9 rounded-lg border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] px-2 text-[14px] text-[var(--ax-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F8B5F]'
const btn = 'h-9 rounded-lg px-4 text-[14px] font-medium transition-colors duration-[120ms] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F8B5F]'

async function post(body: Record<string, unknown>): Promise<boolean> {
  const r = await fetch('/api/admin/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.ok
}

function fmtDay(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' }).format(new Date(`${date}T12:00:00+08:00`))
}

function fmtRange(b: MeetingBooking): string {
  const f = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ru-RU', { ...o, timeZone: 'Asia/Makassar' }).format(new Date(iso))
  return `${f(b.start_at, { weekday: 'short', day: 'numeric', month: 'short' })}, ${f(b.start_at, { hour: '2-digit', minute: '2-digit' })}–${f(b.end_at, { hour: '2-digit', minute: '2-digit' })}`
}

export function MeetingsAdmin(props: {
  settings: MeetingSettings
  connection: { email: string | null; updatedAt: string } | null
  googleNotice: string | null
  days: string[]
  dayRows: DayRow[]
  bookings: MeetingBooking[]
}) {
  const names = new Map(props.settings.districts.map(d => [d.key, d.ru]))
  return (
    <div className="mx-auto grid max-w-[1120px] gap-8 px-4 pt-6 md:px-6">
      <GoogleSection connection={props.connection} notice={props.googleNotice} />
      <DaysSection days={props.days} dayRows={props.dayRows} bookings={props.bookings} districts={props.settings.districts} />
      <BookingsSection bookings={props.bookings} names={names} />
      <SettingsSection initial={props.settings} />
    </div>
  )
}

function GoogleSection({ connection, notice }: { connection: { email: string | null } | null; notice: string | null }) {
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold">Google Календарь</h2>
          <p className="mt-1 text-[14px] text-[var(--ax-fg-soft)]">
            {connection ? <>Подключён: <strong>{connection.email ?? 'аккаунт без email'}</strong>. Занятость читается из него, встречи пишутся в него.</> : 'Не подключён — запись на сайте закрыта, пока календарь не подключён.'}
          </p>
          {notice && <p className="mt-2 text-[14px] text-[#E0A93B]">{notice}</p>}
        </div>
        <a href="/api/admin/google/connect" className={`${btn} inline-flex items-center bg-[#1F8B5F] text-white no-underline hover:bg-[#197551]`}>
          {connection ? 'Переподключить' : 'Подключить Google'}
        </a>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--ax-border)] pt-4 text-[14px]">
        <span className="text-[var(--ax-fg-muted)]">Ссылка для записи:</span>
        {PUBLIC_LINKS.map(l => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-[#4FC08D] break-all">{l.label} · {l.url.replace('https://', '')}</a>
        ))}
      </div>
    </section>
  )
}

function DaysSection({ days, dayRows, bookings, districts }: { days: string[]; dayRows: DayRow[]; bookings: MeetingBooking[]; districts: District[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const byDay = new Map(dayRows.map(r => [r.day, r]))
  const countByDay = new Map<string, number>()
  for (const b of bookings) {
    if (b.status !== 'confirmed') continue
    const d = new Date(Date.parse(b.start_at) + 8 * 3600_000).toISOString().slice(0, 10)
    countByDay.set(d, (countByDay.get(d) ?? 0) + 1)
  }

  function change(day: string, district: string) {
    setError(null)
    startTransition(async () => {
      const ok = await post({ action: 'day', day, district: district || null })
      if (!ok) setError('Не сохранилось — попробуйте ещё раз.')
      router.refresh()
    })
  }

  return (
    <section className={panel}>
      <h2 className="text-[16px] font-semibold">Где я по дням</h2>
      <p className="mt-1 max-w-[68ch] text-[14px] text-[var(--ax-fg-soft)]">
        Гость видит район у дня и может записаться на живую встречу только в нём. Пустой день закрепляется за районом первой живой записью.
      </p>
      {error && <p className="mt-2 text-[14px] text-[#F87171]">{error}</p>}
      <ul className={`mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${pending ? 'opacity-60' : ''}`}>
        {days.map(day => {
          const row = byDay.get(day)
          const count = countByDay.get(day) ?? 0
          return (
            <li key={day} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ax-border)] px-3 py-2">
              <div className="min-w-0">
                <div className="text-[14px] font-medium first-letter:uppercase">{fmtDay(day)}</div>
                <div className="text-[12px] text-[var(--ax-fg-muted)]">
                  {count ? `${count} встр.` : 'нет встреч'}{row?.source === 'booking' ? ' · по записи' : ''}
                </div>
              </div>
              <select aria-label={`Район на ${fmtDay(day)}`} className={`${input} max-w-[150px]`} value={row?.district ?? ''} disabled={pending} onChange={e => change(day, e.target.value)}>
                <option value="">— любой —</option>
                {districts.map(d => <option key={d.key} value={d.key}>{d.ru}</option>)}
              </select>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function BookingsSection({ bookings, names }: { bookings: MeetingBooking[]; names: Map<string, string> }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const upcoming = bookings.filter(b => b.status === 'confirmed')

  async function cancel(b: MeetingBooking) {
    if (busyId) return
    setBusyId(b.id)
    setError(null)
    const ok = await post({ action: 'cancel', id: b.id })
    if (!ok) setError('Отмена не прошла — проверьте подключение календаря.')
    setBusyId(null)
    router.refresh()
  }

  return (
    <section className={panel}>
      <h2 className="text-[16px] font-semibold">Ближайшие встречи</h2>
      {error && <p className="mt-2 text-[14px] text-[#F87171]">{error}</p>}
      {upcoming.length === 0 ? (
        <p className="mt-3 text-[14px] text-[var(--ax-fg-muted)]">Записей пока нет. Как только кто-то запишется, встреча появится здесь, в календаре и в Telegram.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--ax-border)]">
          {upcoming.map(b => (
            <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium first-letter:uppercase">{fmtRange(b)} · {b.format === 'online' ? 'онлайн' : names.get(b.district ?? '') ?? b.district}</div>
                <div className="mt-1 break-words text-[13px] text-[var(--ax-fg-soft)]">
                  {b.guest_name} · {b.guest_email}{b.guest_contact ? ` · ${b.guest_contact}` : ''}
                </div>
                {b.comment && <div className="mt-1 break-words text-[13px] text-[var(--ax-fg-muted)]">{b.comment}</div>}
                {b.meet_url && <a href={b.meet_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[13px] text-[#4FC08D]">Google Meet</a>}
              </div>
              <button type="button" onClick={() => cancel(b)} disabled={busyId !== null} className={`${btn} border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)]`}>
                {busyId === b.id ? 'Отменяю…' : 'Отменить'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <label className="grid gap-1 text-[13px] text-[var(--ax-fg-soft)]">
      {label}
      <input type="number" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className={`${input} w-full`} />
    </label>
  )
}

function SettingsSection({ initial }: { initial: MeetingSettings }) {
  const router = useRouter()
  const [s, setS] = useState<MeetingSettings>(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const set = <K extends keyof MeetingSettings>(k: K, v: MeetingSettings[K]) => { setS(prev => ({ ...prev, [k]: v })); setState('idle') }
  const setDistrict = (i: number, patch: Partial<District>) => set('districts', s.districts.map((d, j) => (j === i ? { ...d, ...patch } : d)))

  async function save() {
    setState('saving')
    const ok = await post({ action: 'settings', settings: s })
    setState(ok ? 'saved' : 'error')
    if (ok) router.refresh()
  }

  return (
    <section className={panel}>
      <h2 className="text-[16px] font-semibold">Настройки</h2>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Рабочие дни">
        {WEEKDAYS.map((w, i) => {
          const day = i + 1
          const on = s.workDays.includes(day)
          return (
            <button key={w} type="button" aria-pressed={on} onClick={() => set('workDays', on ? s.workDays.filter(d => d !== day) : [...s.workDays, day].sort())}
              className={`${btn} px-3 border ${on ? 'border-[#1F8B5F] bg-[#1F8B5F] text-white' : 'border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)]'}`}>{w}</button>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="grid gap-1 text-[13px] text-[var(--ax-fg-soft)]">Начало дня<input type="time" value={s.workStart} onChange={e => set('workStart', e.target.value)} className={input} /></label>
        <label className="grid gap-1 text-[13px] text-[var(--ax-fg-soft)]">Конец дня<input type="time" value={s.workEnd} onChange={e => set('workEnd', e.target.value)} className={input} /></label>
        <NumberField label="Онлайн, мин" value={s.onlineMin} min={15} max={240} onChange={v => set('onlineMin', v)} />
        <NumberField label="Живая, мин" value={s.offlineMin} min={15} max={240} onChange={v => set('offlineMin', v)} />
        <NumberField label="Зазор вокруг онлайна, мин" value={s.bufferMin} min={0} max={120} onChange={v => set('bufferMin', v)} />
        <NumberField label="Между живыми в районе, мин" value={s.sameDistrictGapMin} min={0} max={180} onChange={v => set('sameDistrictGapMin', v)} />
        <NumberField label="Шаг сетки, мин" value={s.stepMin} min={15} max={120} onChange={v => set('stepMin', v)} />
        <NumberField label="Запись не позже чем за, мин" value={s.minNoticeMin} min={0} max={10080} onChange={v => set('minNoticeMin', v)} />
        <NumberField label="Открыто дней вперёд" value={s.horizonDays} min={1} max={90} onChange={v => set('horizonDays', v)} />
      </div>

      <h3 className="mt-8 text-[14px] font-semibold">Районы и дорога из дома</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-[14px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)]">
              <th className="pb-2 font-medium">Ключ</th><th className="pb-2 font-medium">Название RU</th><th className="pb-2 font-medium">EN</th><th className="pb-2 font-medium">Дорога, мин</th><th />
            </tr>
          </thead>
          <tbody>
            {s.districts.map((d, i) => (
              <tr key={i}>
                <td className="py-1 pr-2"><input aria-label="Ключ" value={d.key} onChange={e => setDistrict(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} className={`${input} w-28`} /></td>
                <td className="py-1 pr-2"><input aria-label="Название RU" value={d.ru} onChange={e => setDistrict(i, { ru: e.target.value })} className={`${input} w-full`} /></td>
                <td className="py-1 pr-2"><input aria-label="Название EN" value={d.en} onChange={e => setDistrict(i, { en: e.target.value })} className={`${input} w-full`} /></td>
                <td className="py-1 pr-2"><input aria-label="Дорога, мин" type="number" min={0} max={300} value={d.travelMin} onChange={e => setDistrict(i, { travelMin: Number(e.target.value) })} className={`${input} w-20`} /></td>
                <td className="py-1 text-right">
                  <button type="button" onClick={() => set('districts', s.districts.filter((_, j) => j !== i))} disabled={s.districts.length === 1}
                    className={`${btn} px-2 text-[var(--ax-fg-muted)] hover:text-[#F87171]`} aria-label={`Удалить ${d.ru}`}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => set('districts', [...s.districts, { key: '', ru: '', en: '', travelMin: 60 }])} className={`${btn} mt-2 px-0 text-[#4FC08D]`}>+ Добавить район</button>

      <div className="mt-6 flex items-center gap-4 border-t border-[var(--ax-border)] pt-4">
        <button type="button" onClick={save} disabled={state === 'saving'} className={`${btn} bg-[#1F8B5F] text-white hover:bg-[#197551]`}>
          {state === 'saving' ? 'Сохраняю…' : 'Сохранить настройки'}
        </button>
        {state === 'saved' && <span className="text-[14px] text-[#4FC08D]">Сохранено</span>}
        {state === 'error' && <span className="text-[14px] text-[#F87171]">Не сохранилось: проверьте поля — у района нужны ключ, оба названия и дорога.</span>}
      </div>
    </section>
  )
}
