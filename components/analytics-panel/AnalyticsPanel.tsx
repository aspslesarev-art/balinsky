'use client'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MONEY_RE, type Analysis } from '@/lib/analytics-panel/types'
import { useCurrency } from '@/components/CurrencyContext'
import { formatMoney } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'
import { VizView } from './VizView'

// Слева — список анализов по группам, справа — панель: по клику идёт «сбор»
// по источникам (слова поиска, мелькающие названия, счётчик, лента фото),
// потом итог с графиками. Готовые помечаются ✓ и открываются без повтора.
// Гость видит анимацию, главные цифры и вывод; фото размыты, графики и карты —
// после входа (решение владельца 18.11.2026). Доступ — html[data-pro], его
// ставит AuthFlag.

function plural(n: number, unit: string) {
  const f = unit.split('|')
  if (f.length < 3) return f[0]
  const a = Math.abs(Math.round(n)) % 100, b = a % 10
  return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]
}

// Цвет группы: плашка в списке, метка и полоса над панелью (владелец:
// «части анализа должны быть ярко разделены», 18.11.2026).
const TONES = [
  { main: '#1F8B5F', bg: '#E6F2EC', ink: '#135E40' },
  { main: '#C9772B', bg: '#FBEFE2', ink: '#8A4F17' },
  { main: '#2E7DD1', bg: '#E6EFFA', ink: '#1C5596' },
  { main: '#8E5BD0', bg: '#F0E9F9', ink: '#5E3A91' },
]

const STEP = 26 // тиков (по 100 мс) на один источник
const COPY = {
  ru: {
    heading: 'Проверьте виллу по данным рынка', lead: 'Выберите, что проверить, — соберём данные из нужных источников под эту виллу.',
    count: (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'анализ' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'анализа' : 'анализов'}`,
    idleText: 'Booking, Airbnb, rumah123, госплан зон, карты рисков, Google Maps, Copernicus — под эту виллу.',
    start: (t: string) => `Начать: ${t.toLowerCase()}`, searching: 'Ищем:', filtering: 'Отбираем нужное…', meaning: 'Что это значит для вас:',
    next: (t: string) => `Дальше: ${t.toLowerCase()} →`, again: 'Ещё раз', done: 'готово',
    lockTitle: (n: number) => n > 0 ? `Ещё ${n} ${n === 1 ? 'график или карта' : n < 5 ? 'графика и карты' : 'графиков и карт'} — и фото объектов` : 'Фото объектов и детали',
    lockText: 'Откроются после входа — через Google или почту.', signIn: 'Войти и открыть всё',
    pendingTitle: 'Доступ Pro на проверке', pendingText: 'Графики, карты и фото откроются, как только проверим доступ. Обычно в течение дня.',
  },
  en: {
    heading: 'Check the villa against market data', lead: 'Pick what to check — we gather data from the right sources for this villa.',
    count: (n: number) => `${n} checks`,
    idleText: 'Booking, Airbnb, rumah123, zoning plan, hazard maps, Google Maps, Copernicus — for this villa.',
    start: (t: string) => `Start: ${t.toLowerCase()}`, searching: 'Searching:', filtering: 'Filtering…', meaning: 'What it means for you:',
    next: (t: string) => `Next: ${t.toLowerCase()} →`, again: 'Run again', done: 'done',
    lockTitle: (n: number) => n > 0 ? `${n} more charts and maps — plus listing photos` : 'Listing photos and details',
    lockText: 'Available after signing in — with Google or email.', signIn: 'Sign in to see everything',
    pendingTitle: 'Pro access under review', pendingText: 'Charts, maps and photos open once we approve access. Usually within a day.',
  },
}

function useAccess(): 'pro' | 'pending' | 'guest' {
  const [a, setA] = useState<'pro' | 'pending' | 'guest'>('guest')
  useEffect(() => {
    const h = document.documentElement
    const read = () => setA(h.getAttribute('data-pro') === '1' ? 'pro' : h.getAttribute('data-auth') === '1' ? 'pending' : 'guest')
    read()
    const mo = new MutationObserver(read)
    mo.observe(h, { attributes: true, attributeFilter: ['data-pro', 'data-auth'] })
    return () => mo.disconnect()
  }, [])
  return a
}

// Все строки анализа: ⟦usd⟧ → сумма в валюте посетителя.
function withMoney<T>(x: T, f: (s: string) => string): T {
  if (typeof x === 'string') return f(x) as T
  if (Array.isArray(x)) return x.map(v => withMoney(v, f)) as T
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, withMoney(v, f)])) as T
  return x
}

export function AnalyticsPanel({ analyses: raw, lang, extras, signInHref, eyebrow }: {
  analyses: Analysis[]
  lang: string
  /** Готовые блоки страницы под итогом анализа (калькулятор дохода и т.п.) — только с доступом. */
  extras?: Record<string, ReactNode>
  signInHref: string
  eyebrow?: string
}) {
  const c = lang === 'ru' ? COPY.ru : COPY.en
  const access = useAccess()
  const { currency } = useCurrency()
  const analyses = useMemo(() => withMoney(raw, s => s.replace(MONEY_RE, (_, n) => formatMoney(Number(n), currency, lang as Lang))), [raw, currency, lang])
  const [goal, setGoal] = useState<string | null>(null)
  const [t, setT] = useState(0)
  const [done, setDone] = useState<Record<string, true>>({})
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const byId = Object.fromEntries(analyses.map(a => [a.id, a]))
  const endOf = (a: Analysis) => a.sources.length * STEP + 6

  function pick(id: string, replay = false) {
    const a = byId[id]
    if (!a) return
    if (timer.current) clearInterval(timer.current)
    setGoal(id)
    if (window.matchMedia?.('(max-width: 767px)').matches) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const end = endOf(a)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if ((done[id] && !replay) || reduce) { setT(end); setDone(d => ({ ...d, [id]: true })); return }
    setT(0)
    // Время по часам, а не по числу тиков: на тяжёлой странице таймер
    // отстаёт, и сбор растягивался вдвое.
    const t0 = performance.now()
    timer.current = setInterval(() => {
      const cur = (performance.now() - t0) / 100
      if (cur >= end) { if (timer.current) clearInterval(timer.current); setT(end); setDone(d => ({ ...d, [id]: true })) }
      else setT(cur)
    }, 80)
  }

  const groups: { name: string; items: Analysis[] }[] = []
  for (const a of analyses) {
    const g = groups.find(x => x.name === a.group)
    if (g) g.items.push(a); else groups.push({ name: a.group, items: [a] })
  }
  const flat = groups.flatMap(g => g.items)
  const G = goal ? byId[goal] : null
  const end = G ? endOf(G) : 0
  const busy = G && t < end ? G.id : null
  const finished = !!G && t >= end
  const locked = access !== 'pro'
  const nextA = G ? flat[flat.findIndex(a => a.id === G.id) + 1] : null
  const gTone = TONES[Math.max(0, groups.findIndex(g => g.name === G?.group)) % TONES.length]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {eyebrow && <div className="text-[13px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">{eyebrow}</div>}
        <h2 className="m-0 font-display text-[28px] md:text-[32px] font-bold leading-[1.2] tracking-[-0.02em]">{c.heading}</h2>
        <p className="m-0 max-w-[68ch] text-[16px] leading-[1.6] text-[var(--color-text-muted)]">{c.lead}</p>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <nav aria-label={c.heading} className="flex w-full flex-col gap-3 md:w-auto md:max-w-[300px]" style={{ flex: '1 1 260px' }}>
          {groups.map((g, gi) => {
            const tone = TONES[gi % TONES.length]
            const open = !!G && G.group === g.name
            return (
              <div key={g.name} className="flex flex-col gap-1 rounded-xl p-2" style={{ background: tone.bg, boxShadow: open ? `inset 0 0 0 2px ${tone.main}` : undefined }}>
                <div className="flex items-center gap-2.5 px-2 pb-1.5 pt-1">
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[13px] font-bold tabular-nums text-white" style={{ background: tone.ink }}>{String(gi + 1).padStart(2, '0')}</span>
                  <span className="text-[17px] font-semibold leading-tight" style={{ color: tone.ink }}>{g.name}</span>
                  <span className="ml-auto shrink-0 whitespace-nowrap text-[13px] tabular-nums" style={{ color: tone.ink }}>{g.items.filter(a => done[a.id]).length}/{g.items.length}</span>
                </div>
                {g.items.map(a => {
                  const sel = goal === a.id
                  return (
                    <button key={a.id} type="button" onClick={() => pick(a.id)} aria-current={sel ? 'true' : undefined}
                      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-0 bg-white p-3 text-left shadow-[0_1px_2px_rgb(0_0_0/.04)] transition-[box-shadow,transform] duration-[120ms] hover:-translate-y-px hover:shadow-[0_1px_2px_rgb(0_0_0/.05),0_6px_16px_rgb(0_0_0/.07)] focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ boxShadow: sel ? `inset 4px 0 0 ${tone.main}, 0 1px 2px rgb(0 0 0 / .05)` : undefined, outlineColor: tone.main }}>
                      <span className="flex min-w-0 flex-grow flex-col gap-0.5">
                        <span className={`text-[16px] leading-[1.3] ${sel ? 'font-semibold' : 'font-medium'}`}>{a.title}</span>
                        <span className="truncate text-[13px] text-[var(--color-text-muted)]">{a.sources.map(s => s.name).join(' · ')}</span>
                      </span>
                      {busy === a.id ? <span className="ap-spin h-4 w-4 shrink-0 rounded-full border-2 border-[#E78C3D] border-r-transparent" />
                        : done[a.id] ? <Check label={c.done} />
                        : <Arrow color={tone.main} />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div ref={panelRef} className="flex min-h-[520px] min-w-0 scroll-mt-24 flex-col overflow-hidden rounded-xl border border-[var(--color-border)]" style={{ flex: '999 1 420px' }}>
          {!G ? (
            <div className="flex flex-grow flex-col items-start justify-center gap-4 bg-[var(--color-surface-alt)] p-8 md:p-12">
              <div className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em]">{c.count(analyses.length)}</div>
              <div className="max-w-[46ch] text-[16px] leading-[1.6] text-[var(--color-text-muted)]">{c.idleText}</div>
              <button type="button" onClick={() => pick(flat[0].id)} className="h-12 cursor-pointer rounded-xl border-0 bg-[var(--color-primary)] px-6 text-[16px] font-semibold text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">{c.start(flat[0].title)}</button>
            </div>
          ) : (
            <>
              <div className="h-1 bg-[#EEF1EF]"><div className="h-1 transition-[width] duration-100 ease-linear" style={{ background: gTone.main, width: `${Math.round(Math.min(1, t / end) * 100)}%` }} /></div>
              <div className="flex flex-col gap-1 px-4 pt-6 md:px-6">
                <span className="mb-1 inline-flex items-center gap-2 self-start rounded-md px-2 py-1 text-[13px] font-semibold" style={{ background: gTone.bg, color: gTone.ink }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: gTone.main }} />{G.group}
                </span>
                <div className="text-[22px] font-semibold leading-[1.25]">{G.title}</div>
                <div className="text-[14px] text-[var(--color-text-muted)]">{G.sub}</div>
              </div>
              <div className="flex flex-col gap-3 px-4 pb-6 pt-4 md:px-6">
                {G.sources.map((s, i) => {
                  const lt = t - i * STEP
                  if (lt < 0) return null
                  const fin = lt >= 24
                  const scanT = Math.max(0, Math.min(1, (lt - 6) / 14))
                  return (
                    <div key={s.name} className={`ap-in flex flex-col gap-2 rounded-lg p-4 transition-colors duration-300 ${fin ? 'bg-[var(--color-surface-alt)]' : 'bg-[#FFF6EE]'}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        {fin ? <Check label={c.done} /> : <span className="ap-spin m-0.5 h-4 w-4 rounded-full border-2 border-[#E78C3D] border-r-transparent" />}
                        <span className="text-[16px] font-semibold">{s.name}</span>
                        <span className="text-[13px] text-[var(--color-text-muted)]">· {s.fresh}</span>
                      </div>
                      {!fin && (
                        <div className="flex min-h-[30px] flex-wrap items-center gap-2">
                          <span className="text-[13px] text-[var(--color-text-muted)]">{c.searching}</span>
                          {s.chips.map((ch, k) => lt >= k * 1.5 && <span key={ch} className="ap-chip rounded-full border border-[#CDD3D0] bg-white px-3 py-1 text-[13px] font-medium">{ch}</span>)}
                        </div>
                      )}
                      {lt >= 6 && lt < 20 && (
                        <div className="flex items-baseline gap-4 text-[14px] text-[#39413D]">
                          <span className="min-w-24 font-semibold tabular-nums text-[var(--color-text)]">{Math.round(s.total * scanT).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')} {plural(s.total * scanT, s.unit)}</span>
                          <span className="truncate">{s.names[Math.floor(lt) % Math.max(1, s.names.length)]}<span className="ap-blink">▍</span></span>
                        </div>
                      )}
                      {lt >= 20 && lt < 24 && <div className="text-[14px] text-[#39413D]">{c.filtering}</div>}
                      {s.items && s.items.length > 0 && lt >= 12 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [scroll-snap-type:x_mandatory]">
                          {s.items.map((it, k) => lt >= 12 + k * 2 && (
                            <a key={k} href={locked ? undefined : it.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="ap-chip flex w-[168px] shrink-0 snap-start flex-col gap-1.5 text-[var(--color-text)] no-underline">
                              {/* eslint-disable-next-line @next/next/no-img-element -- внешние фото Booking/Airbnb/rumah123 */}
                              <img src={it.photo ?? ''} alt={it.name} loading="lazy" className="h-28 w-[168px] rounded-lg bg-[#EEF1EF] object-cover" style={{ filter: locked ? 'blur(6px)' : undefined }} />
                              <span className="line-clamp-2 text-[13px] font-semibold leading-[1.3]">{it.name}</span>
                              <span className="text-[13px] tabular-nums text-[#39413D]" style={{ filter: locked ? 'blur(4px)' : undefined }}>{it.meta}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {fin && <div className="ap-in pl-7 text-[15px] leading-[1.5]">{s.result}</div>}
                    </div>
                  )
                })}
              </div>

              {finished && (
                <div className="ap-in mt-auto flex flex-col gap-4 border-t border-[var(--color-border)] bg-[var(--color-primary-soft)] p-4 md:p-6">
                  <div className="flex flex-wrap gap-x-12 gap-y-4">
                    {G.bigs.map(b => (
                      <div key={b.l}>
                        <div className="text-[36px] md:text-[40px] font-bold leading-[1.1] tracking-[-0.03em] tabular-nums">{b.v}</div>
                        <div className="text-[14px] text-[#39413D]">{b.l}</div>
                      </div>
                    ))}
                  </div>
                  {locked ? (
                    <div className="flex flex-wrap items-center gap-6 rounded-xl bg-white p-6">
                      <div className="flex flex-col gap-1.5" style={{ flex: '1 1 260px' }}>
                        <div className="text-[17px] font-semibold">{access === 'pending' ? c.pendingTitle : c.lockTitle(G.vizs.length)}</div>
                        <div className="text-[14px] leading-[1.5] text-[#39413D]">{access === 'pending' ? c.pendingText : c.lockText}</div>
                      </div>
                      {access === 'guest' && <a href={signInHref} className="flex h-12 items-center rounded-xl bg-[var(--color-primary)] px-6 text-[15px] font-semibold text-white no-underline hover:bg-[var(--color-primary-hover)]">{c.signIn}</a>}
                    </div>
                  ) : (
                    <>
                      {G.vizs.map((v, k) => <VizView key={k} v={v} lang={lang} />)}
                      {extras?.[G.id]}
                    </>
                  )}
                  <div className="max-w-[64ch] text-[16px] leading-[1.6]"><b>{c.meaning}</b> {G.meaning}</div>
                  {G.footnote && <div className="text-[13px] text-[#39413D]">{G.footnote}</div>}
                  <div className="flex flex-wrap gap-2">
                    {nextA && <button type="button" onClick={() => pick(nextA.id)} className="h-12 cursor-pointer rounded-xl border-0 bg-[var(--color-primary)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--color-primary-hover)]">{c.next(nextA.title)}</button>}
                    <button type="button" onClick={() => pick(G.id, true)} className="h-12 cursor-pointer border-0 bg-transparent px-2 text-[15px] text-[var(--color-text)] underline">{c.again}</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Check({ label }: { label: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" role="img" aria-label={label} className="shrink-0">
      <circle cx="10" cy="10" r="10" fill="#1F8B5F" />
      <path d="M6 10.5l2.5 2.5L14 7.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function Arrow({ color }: { color: string }) {
  return <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0" style={{ color }}><path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
