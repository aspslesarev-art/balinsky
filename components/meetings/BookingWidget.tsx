'use client'

// Запись на встречу для гостя: формат → день (с районом, где владелец
// будет в этот день) → район и время → контакты. Данные — /api/meetings/*.

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarCheck, Loader2, MapPin, Video } from 'lucide-react'
import type { AvailabilityDay, MeetingFormat } from '@/lib/meetings/types'
import { MEETING_COPY, type MeetingLang } from './copy'

type DistrictName = { key: string; ru: string; en: string }
type Availability = { onlineMin: number; offlineMin: number; districts: DistrictName[]; days: AvailabilityDay[] }
type Booked = { start_at: string; end_at: string; format: MeetingFormat; district: string | null; meet_url: string | null }
type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; data: Availability }

const LOCALE: Record<MeetingLang, string> = { ru: 'ru-RU', en: 'en-GB' }

function dayLabel(date: string, lang: MeetingLang): { weekday: string; day: string } {
  const d = new Date(`${date}T12:00:00+08:00`)
  return {
    weekday: new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short', timeZone: 'Asia/Makassar' }).format(d),
    day: new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' }).format(d),
  }
}

function fullDate(date: string, lang: MeetingLang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Makassar' })
    .format(new Date(`${date}T12:00:00+08:00`))
}

function slotsFor(day: AvailabilityDay, format: MeetingFormat): number {
  return format === 'online' ? day.online.length : Object.values(day.offline).reduce((n, s) => n + s.length, 0)
}

/** Недели по понедельникам, чтобы дни стояли в привычной сетке. */
function groupByWeek(days: AvailabilityDay[]): AvailabilityDay[][] {
  const weeks: AvailabilityDay[][] = []
  for (const d of days) {
    const isMonday = new Date(`${d.date}T00:00:00Z`).getUTCDay() === 1
    if (weeks.length === 0 || isMonday) weeks.push([])
    weeks[weeks.length - 1].push(d)
  }
  return weeks.filter(w => w.length > 0)
}

export function BookingWidget({ lang }: { lang: MeetingLang }) {
  const c = MEETING_COPY[lang]
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  // Встречи только онлайн: Balinsky — информационная площадка, личных
  // встреч с посетителями на Бали не проводит. Ветки offline ниже
  // остаются в коде, но публично недостижимы.
  const [format] = useState<MeetingFormat>('online')
  const [date, setDate] = useState<string | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [booked, setBooked] = useState<Booked | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/meetings/availability', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        if (j.ok) setLoad({ kind: 'ready', data: j })
        else setLoad({ kind: 'error', message: j.error === 'calendar_not_connected' ? c.errClosed : c.errLoad })
      })
      .catch(() => alive && setLoad({ kind: 'error', message: c.errLoad }))
    return () => { alive = false }
  }, [c, reloadKey])

  const data = load.kind === 'ready' ? load.data : null
  const names = useMemo(() => new Map((data?.districts ?? []).map(d => [d.key, d[lang]])), [data, lang])
  const selectedDay = data?.days.find(d => d.date === date) ?? null
  const workingDays = useMemo(() => (data?.days ?? []).filter(d => d.online.length > 0 || Object.keys(d.offline).length > 0 || d.district), [data])

  const offlineChoices = selectedDay ? Object.keys(selectedDay.offline) : []
  const activeDistrict = format === 'offline' ? (selectedDay?.district ?? district) : null
  const times = !selectedDay ? [] : format === 'online' ? selectedDay.online : activeDistrict ? selectedDay.offline[activeDistrict] ?? [] : []

  function pickDay(d: AvailabilityDay) {
    setDate(d.date)
    setTime(null)
    const choices = Object.keys(d.offline)
    setDistrict(d.district ?? (choices.length === 1 ? choices[0] : null))
    setSubmitError(null)
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!date || !time) return
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setSubmitError(null)
    try {
      const r = await fetch('/api/meetings/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, time, format, district: activeDistrict, lang,
          name: form.get('name'), email: form.get('email'), contact: form.get('contact'), comment: form.get('comment'),
        }),
      })
      const j = await r.json()
      if (j.ok) {
        setBooked(j.booking)
        return
      }
      if (j.error === 'slot_taken') {
        setSubmitError(c.errTaken)
        setTime(null)
        setReloadKey(k => k + 1)
      } else if (j.error === 'bad_email') setSubmitError(c.errEmail)
      else if (j.error === 'rate_limited') setSubmitError(c.errRate)
      else setSubmitError(c.errSubmit)
    } catch {
      setSubmitError(c.errSubmit)
    } finally {
      setSubmitting(false)
    }
  }

  if (booked && date && time) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 sm:p-8 max-w-[640px]" aria-live="polite">
        <CalendarCheck className="text-[var(--color-primary)]" size={32} strokeWidth={1.75} aria-hidden />
        <h2 className="mt-4 text-[1.5rem] font-semibold tracking-tight leading-tight">{c.doneTitle}</h2>
        <p className="mt-2 text-[var(--color-text-muted)] leading-relaxed">{c.doneText}</p>
        <dl className="mt-6 grid gap-3 text-[0.9375rem]">
          <div className="flex gap-3"><dt className="w-24 shrink-0 text-[var(--color-text-muted)]">{c.when}</dt><dd className="first-letter:uppercase">{fullDate(date, lang)}, {time}</dd></div>
          <div className="flex gap-3"><dt className="w-24 shrink-0 text-[var(--color-text-muted)]">{c.where}</dt><dd>{booked.format === 'online' ? c.onlineWhere : `${booked.district}, ${c.bali}`}</dd></div>
          {booked.meet_url && (
            <div className="flex gap-3"><dt className="w-24 shrink-0 text-[var(--color-text-muted)]">Meet</dt><dd><a className="text-[var(--color-primary)] underline underline-offset-2 break-all" href={booked.meet_url} target="_blank" rel="noopener noreferrer">{booked.meet_url}</a></dd></div>
          )}
        </dl>
      </section>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="min-w-0">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
          <Video size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-[var(--color-primary)]" />
          <div className="min-w-0">
            <div className="text-[0.9375rem] font-medium text-[var(--color-text)]">{c.online}</div>
            <div className="text-[0.8125rem] text-[var(--color-text-muted)]">
              {data ? `${data.onlineMin} ${c.min} · Google Meet` : 'Google Meet'}
            </div>
          </div>
        </div>

        <section className="mt-12" aria-labelledby="meet-days">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="meet-days" className="text-[0.8125rem] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{c.step2}</h2>
            <span className="text-[0.8125rem] text-[var(--color-text-muted)]">{c.tz}</span>
          </div>

          {load.kind === 'loading' && <DaysSkeleton />}
          {load.kind === 'error' && (
            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-5 text-[0.9375rem]">
              <p>{load.message}</p>
              <button type="button" onClick={() => { setLoad({ kind: 'loading' }); setReloadKey(k => k + 1) }}
                className="mt-3 text-[var(--color-primary)] font-medium underline underline-offset-2 hover:text-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] rounded">
                {c.retry}
              </button>
            </div>
          )}
          {data && workingDays.length === 0 && <p className="mt-4 text-[0.9375rem] text-[var(--color-text-muted)]">{c.noDays}</p>}
          {data && (
            <div className="mt-4 grid gap-6">
              {groupByWeek(workingDays).map(week => (
                <div key={week[0].date} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {week.map(d => (
                    <DayButton key={d.date} day={d} lang={lang} selected={d.date === date} format={format}
                      districtLabel={d.district ? names.get(d.district) ?? d.district : null} copy={c} onPick={() => pickDay(d)} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div ref={panelRef} className="scroll-mt-24 lg:sticky lg:top-24">
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6" aria-live="polite">
          {!selectedDay ? (
            <p className="text-[0.9375rem] leading-relaxed text-[var(--color-text-muted)]">{c.pickDayFirst}</p>
          ) : (
            <>
              <h2 className="text-[1.25rem] font-semibold tracking-tight leading-tight first-letter:uppercase">{fullDate(selectedDay.date, lang)}</h2>

              {format === 'offline' && (
                selectedDay.district ? (
                  <p className="mt-2 flex items-start gap-2 text-[0.9375rem] leading-relaxed">
                    <MapPin size={16} className="mt-1 shrink-0 text-[var(--color-primary)]" aria-hidden />
                    <span>{c.dayIn} <strong className="font-semibold">{names.get(selectedDay.district)}</strong>. {c.dayInTail}</span>
                  </p>
                ) : (
                  <div className="mt-4">
                    <p className="text-[0.875rem] leading-relaxed text-[var(--color-text-muted)]">{c.pickDistrict}</p>
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={c.district}>
                      {offlineChoices.map(k => (
                        <Chip key={k} active={district === k} onClick={() => { setDistrict(k); setTime(null) }}>{names.get(k) ?? k}</Chip>
                      ))}
                    </div>
                  </div>
                )
              )}

              {(format === 'online' || activeDistrict) && (
                <div className="mt-6">
                  <h3 className="text-[0.8125rem] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{c.step3}</h3>
                  {times.length === 0 ? (
                    <p className="mt-2 text-[0.9375rem] text-[var(--color-text-muted)]">{c.noTimes}</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={c.step3}>
                      {times.map(t => <Chip key={t} active={time === t} onClick={() => setTime(t)} block>{t}</Chip>)}
                    </div>
                  )}
                </div>
              )}

              {time && (
                <form onSubmit={submit} className="mt-8 grid gap-4 border-t border-[var(--color-border)] pt-6">
                  <Field name="name" label={c.name} autoComplete="name" required maxLength={120} />
                  <Field name="email" label={c.email} type="email" autoComplete="email" required maxLength={200} hint={c.emailHint} />
                  <Field name="contact" label={c.contact} autoComplete="tel" maxLength={120} />
                  <Field name="comment" label={format === 'offline' ? c.commentOffline : c.comment} textarea maxLength={1000} />
                  {submitError && <p role="alert" className="text-[0.875rem] text-[#B42318]">{submitError}</p>}
                  <button type="submit" disabled={submitting}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-pressed)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                    {submitting && <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />}
                    {submitting ? c.submitting : `${c.submit} · ${time}`}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function DayButton({ day, lang, selected, format, districtLabel, copy, onPick }: {
  day: AvailabilityDay; lang: MeetingLang; selected: boolean; format: MeetingFormat; districtLabel: string | null
  copy: (typeof MEETING_COPY)[MeetingLang]; onPick: () => void
}) {
  const { weekday, day: dm } = dayLabel(day.date, lang)
  const count = slotsFor(day, format)
  const disabled = count === 0
  return (
    <button type="button" onClick={onPick} disabled={disabled} aria-pressed={selected}
      className={`flex min-h-[88px] flex-col items-start rounded-xl border p-2.5 sm:p-3 text-left transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed ${
        selected ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
          : disabled ? 'border-transparent bg-[#EEF2EF] text-[#8A948E]'
            : 'border-[var(--color-border)] bg-white hover:border-[#C9D6CF]'}`}>
      <span className="text-[0.8125rem] uppercase tracking-wide opacity-80">{weekday}</span>
      <span className="font-semibold">{dm}</span>
      <span className={`mt-auto pt-2 flex items-center gap-1 text-[0.8125rem] leading-tight ${districtLabel && !disabled ? 'text-[var(--color-primary)]' : ''}`}>
        {districtLabel ? <><MapPin size={12} aria-hidden className="shrink-0" />{districtLabel}{disabled ? ` · ${copy.full}` : ''}</> : disabled ? copy.full : copy.anyDistrict}
      </span>
    </button>
  )
}

function Chip({ active, onClick, children, block }: { active: boolean; onClick: () => void; children: React.ReactNode; block?: boolean }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick}
      className={`h-10 rounded-lg border px-3 text-[0.9375rem] font-medium tabular-nums transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${block ? 'w-full' : ''} ${
        active ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
      {children}
    </button>
  )
}

function Field({ name, label, type = 'text', textarea, hint, ...rest }: {
  name: string; label: string; type?: string; textarea?: boolean; hint?: string; required?: boolean; maxLength?: number; autoComplete?: string
}) {
  const cls = 'mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-[1rem] transition-colors duration-[120ms] hover:border-[#C9D6CF] focus:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-soft)]'
  return (
    <label className="block text-[0.875rem] font-medium">
      {label}{rest.required && <span className="text-[var(--color-text-muted)]"> *</span>}
      {textarea
        ? <textarea name={name} rows={3} className={`${cls} py-2.5 leading-relaxed`} {...rest} />
        : <input name={name} type={type} className={`${cls} h-11`} {...rest} />}
      {hint && <span className="mt-1 block text-[0.8125rem] font-normal text-[var(--color-text-muted)]">{hint}</span>}
    </label>
  )
}

function DaysSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => <div key={i} className="h-[88px] rounded-xl bg-[#EEF2EF] animate-pulse motion-reduce:animate-none" />)}
    </div>
  )
}
