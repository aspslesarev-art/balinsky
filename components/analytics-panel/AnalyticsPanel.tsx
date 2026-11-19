'use client'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MONEY_RE, type Analysis, type Viz } from '@/lib/analytics-panel/types'
import { useCurrency } from '@/components/CurrencyContext'
import { formatMoney } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'
import { VizCover, VizView } from './VizView'

// На странице — карточки анализов на всю ширину, по темам: сверху карта или
// график этого анализа, под ним главная цифра. Нажал — окно на весь экран, как
// у медиаблока: там идёт «сбор» по источникам (слова поиска, мелькающие
// названия, счётчик, лента фото, полоса сверху), потом итог с графиками;
// отчёты листаются вкладками и «Дальше». Макет «ИИ-аналитик — на весь экран»
// (владелец 19.11.2026): claude.ai/artifact/YRqStymPezf5oz2vPeqbPK.
// Гость видит анимацию, главные цифры и вывод; фото размыты, графики и карты —
// после входа (решение владельца 18.11.2026). Доступ — html[data-pro], его
// ставит AuthFlag.

function plural(n: number, unit: string) {
  const f = unit.split('|')
  if (f.length < 3) return f[0]
  const a = Math.abs(Math.round(n)) % 100, b = a % 10
  return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]
}

// Цвет группы: номер темы, вкладки, полоса загрузки (владелец:
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
    heading: 'Проверьте виллу с помощью ИИ', lead: 'Нажмите на любую проверку — ИИ-аналитик соберёт данные из нужных источников и объяснит, что они значат для вас.', badge: 'ИИ-аналитик', working: (k: number, n: number) => `ИИ-аналитик работает · источник ${k} из ${n}`, finished: 'ИИ-аналитик закончил',
    openAll: 'Открыть все отчёты', close: 'Закрыть', prev: 'Назад', of: (k: number, n: number) => `${k} из ${n}`, themes: 'Темы',
    searching: 'ИИ ищет:', filtering: 'ИИ отбирает похожие…', meaning: 'Вывод ИИ:',
    next: (t: string) => `Дальше: ${t.toLowerCase()} →`, again: 'Ещё раз', done: 'готово', open: 'Смотреть', run: 'Запустить ИИ',
    lockTitle: (n: number) => n > 0 ? `Ещё ${n} ${n === 1 ? 'график или карта' : n < 5 ? 'графика и карты' : 'графиков и карт'} — и фото объектов` : 'Фото объектов и детали',
    lockText: 'Откроются после входа — через Google или почту.', signIn: 'Войти и открыть всё',
    pendingTitle: 'Доступ Pro на проверке', pendingText: 'Графики, карты и фото откроются, как только проверим доступ. Обычно в течение дня.',
  },
  en: {
    heading: 'Check the villa with AI', lead: 'Tap any check — the AI analyst gathers data from the right sources and explains what it means for you.', badge: 'AI analyst', working: (k: number, n: number) => `AI analyst at work · source ${k} of ${n}`, finished: 'AI analyst finished',
    openAll: 'Open all reports', close: 'Close', prev: 'Back', of: (k: number, n: number) => `${k} of ${n}`, themes: 'Topics',
    searching: 'AI is searching:', filtering: 'AI is picking similar…', meaning: 'AI verdict:',
    next: (t: string) => `Next: ${t.toLowerCase()} →`, again: 'Run again', done: 'done', open: 'View', run: 'Run AI',
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

/** Картинка карточки: карта (её видно и гостю, если она рисуется во время
 *  сбора), иначе первая карта или снимок итога, иначе первый график. */
function coverOf(a: Analysis): { v: Viz; open: boolean } | null {
  const live = a.sources.map(s => s.live).find((v): v is Viz => !!v)
  if (live) return { v: live, open: true }
  const pic = a.vizs.find(v => v.kind === 'map' || v.kind === 'image')
  const v = pic ?? a.vizs[0]
  return v ? { v, open: false } : null
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
  const [open, setOpen] = useState(false)
  const [t, setT] = useState(0)
  const [done, setDone] = useState<Record<string, true>>({})
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const byId = Object.fromEntries(analyses.map(a => [a.id, a]))
  const endOf = (a: Analysis) => a.sources.length * STEP + 6

  function pick(id: string, replay = false) {
    const a = byId[id]
    if (!a) return
    if (timer.current) clearInterval(timer.current)
    setGoal(id)
    setOpen(true)
    bodyRef.current?.scrollTo({ top: 0 })
    // Вкладка отчёта может быть за краем ленты (телефон) — показать её.
    requestAnimationFrame(() => document.querySelector(`[data-ap-tab="${id}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' }))
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

  function close() {
    if (timer.current) clearInterval(timer.current)
    // Недосмотренный сбор не считаем готовым — при следующем открытии пойдёт заново.
    setOpen(false)
  }

  // Окно на весь экран: Esc закрывает, страница под ним не прокручивается.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

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
  const idx = G ? flat.findIndex(a => a.id === G.id) : -1
  const nextA = G ? flat[(idx + 1) % flat.length] : null
  const prevA = G ? flat[(idx - 1 + flat.length) % flat.length] : null
  const gi = Math.max(0, groups.findIndex(g => g.name === G?.group))
  const gTone = TONES[gi % TONES.length]
  const progress = G ? Math.round(Math.min(1, t / end) * 100) : 0

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-[68ch] flex-col gap-2">
          {eyebrow && <div className="text-[13px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">{eyebrow}</div>}
          <Badge text={c.badge} />
          <h2 className="m-0 font-display text-[28px] md:text-[32px] font-bold leading-[1.2] tracking-[-0.02em]">{c.heading}</h2>
          <p className="m-0 text-[16px] leading-[1.6] text-[var(--color-text-muted)]">{c.lead}</p>
        </div>
        <button type="button" onClick={() => pick(flat[0].id)} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border-0 bg-[var(--color-primary)] px-6 text-[16px] font-semibold text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
          {c.openAll}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
        </button>
      </div>

      {groups.map((g, gi) => {
        const tone = TONES[gi % TONES.length]
        return (
          <section key={g.name} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[13px] font-bold tabular-nums text-white" style={{ background: tone.ink }}>{gi + 1}</span>
              <h3 className="m-0 text-[20px] font-semibold leading-tight">{g.name}</h3>
              <span className="h-px flex-grow bg-[var(--color-border)]" />
            </div>
            {/* Телефон — карточки листаются вбок; планшет и шире — сетка. */}
            <div className="-mx-6 flex w-[calc(100%+3rem)] max-w-none snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-1 md:mx-0 md:grid md:w-auto md:max-w-full md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4">
              {g.items.map(a => {
                const cover = coverOf(a)
                const blur = locked && cover && !cover.open
                const big = a.bigs[0]
                return (
                  <button key={a.id} type="button" onClick={() => pick(a.id)}
                    className="group flex w-[280px] shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white p-0 text-left shadow-[0_1px_2px_rgb(0_0_0/.04),0_4px_12px_rgb(0_0_0/.05)] transition-[box-shadow,transform] duration-[120ms] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgb(0_0_0/.05),0_8px_24px_rgb(0_0_0/.09)] focus-visible:outline-2 focus-visible:outline-offset-2 md:w-auto"
                    style={{ outlineColor: tone.main }}>
                    <span className="relative block aspect-[7/4] w-full overflow-hidden" style={{ background: tone.bg }} aria-hidden={!cover}>
                      {cover && <span className="pointer-events-none absolute inset-0" style={{ filter: blur ? 'blur(6px)' : undefined }}><VizCover v={cover.v} lang={lang} /></span>}
                      {done[a.id] && <span className="absolute right-2 top-2"><Check label={c.done} /></span>}
                    </span>
                    <span className="flex flex-grow flex-col gap-1 px-4 pb-4 pt-3">
                      <span className="text-[17px] font-semibold leading-[1.3] text-[var(--color-text)]">{a.title}</span>
                      {big ? (
                        <span className="text-[14px] leading-[1.45] text-[var(--color-text-muted)]"><b className="font-semibold text-[var(--color-text)]">{big.v}</b> {big.l}</span>
                      ) : (
                        <span className="text-[14px] leading-[1.45] text-[var(--color-text-muted)]">{a.sub}</span>
                      )}
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[14px] font-semibold" style={{ color: tone.ink }}>{done[a.id] ? c.open : c.run}<Arrow color={tone.ink} /></span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      {open && G && (
        <div role="dialog" aria-modal="true" aria-label={c.badge} className="fixed inset-0 z-[9999] flex flex-col bg-white">
          <header className="flex items-center gap-4 border-b border-[var(--color-border)] px-4 py-2 md:gap-6 md:px-6 md:py-3">
            <span className="flex min-w-0 flex-grow flex-col md:max-w-[240px]">
              <span className="text-[13px] text-[var(--color-text-muted)]">{c.badge} · {c.of(idx + 1, flat.length)}</span>
              <span className="truncate text-[16px] font-semibold">{G.title}</span>
            </span>
            <nav aria-label={c.themes} className="hidden flex-grow justify-center gap-2 md:flex">
              {groups.map((g, i) => <ThemeTab key={g.name} name={g.name} n={`${g.items.filter(a => done[a.id]).length}/${g.items.length}`} tone={TONES[i % TONES.length]} on={g.name === G.group} onClick={() => pick(g.items[0].id)} />)}
            </nav>
            <button type="button" onClick={close} aria-label={c.close} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--color-surface-alt)] text-[var(--color-text)] hover:bg-[#E9EEEB] focus-visible:outline-2 focus-visible:outline-offset-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
            </button>
          </header>
          <div className="h-1 shrink-0 bg-[#EEF1EF]"><div className="h-1 transition-[width] duration-100 ease-linear" style={{ background: gTone.main, width: `${progress}%` }} /></div>
          <div className="flex shrink-0 gap-1 overflow-x-auto px-4 py-2 md:px-6" style={{ background: gTone.bg }}>
            {groups[gi].items.map(a => {
              const on = a.id === G.id
              return (
                <button key={a.id} type="button" data-ap-tab={a.id} onClick={() => pick(a.id)} aria-current={on ? 'true' : undefined}
                  className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-0 px-4 text-[15px] ${on ? 'bg-white font-semibold' : 'bg-transparent'}`}
                  style={{ color: gTone.ink, boxShadow: on ? `0 1px 2px rgb(0 0 0 / .05), inset 0 -2px 0 ${gTone.main}` : undefined }}>
                  {busy === a.id ? <span className="ap-spin h-3.5 w-3.5 rounded-full border-2 border-[#E78C3D] border-r-transparent" /> : done[a.id] ? <Check label={c.done} /> : null}
                  {a.title}
                </button>
              )
            })}
          </div>

          <div ref={bodyRef} className="min-h-0 flex-grow overflow-y-auto overscroll-contain">
            <div className="mx-auto flex max-w-[880px] flex-col gap-4 px-4 py-6 md:px-6">
              <div className="flex flex-col gap-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#39413D]" aria-live="polite">
                    {finished ? <Check label={c.done} /> : <span className="ap-spin h-3.5 w-3.5 rounded-full border-2 border-[#0F1A15] border-r-transparent" />}
                    {finished ? c.finished : c.working(Math.min(G.sources.length, Math.floor(t / STEP) + 1), G.sources.length)}
                  </span>
                  <span className="inline-flex items-center gap-2 self-start rounded-md px-2 py-1 text-[13px] font-semibold" style={{ background: gTone.bg, color: gTone.ink }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: gTone.main }} />{G.group}
                  </span>
                </div>
                <h3 className="m-0 font-display text-[24px] md:text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">{G.title}</h3>
                <div className="text-[15px] text-[var(--color-text-muted)]">{G.sub}</div>
              </div>

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
                    {s.live && lt >= 6 && <div className="ap-in"><VizView v={s.live} lang={lang} /></div>}
                    {s.items && s.items.length > 0 && lt >= 12 && (
                      <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [scroll-snap-type:x_mandatory]">
                        {s.items.map((it, k) => lt >= 12 + k * 2 && (
                          <a key={k} href={locked ? undefined : it.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="ap-chip flex w-[168px] shrink-0 snap-start flex-col gap-1.5 text-[var(--color-text)] no-underline">
                            {it.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element -- внешние фото Booking/Airbnb/rumah123
                              <img src={it.photo} alt={it.name} loading="lazy" className="h-28 w-[168px] rounded-lg bg-[#EEF1EF] object-cover" style={{ filter: locked ? 'blur(6px)' : undefined }} />
                            ) : (
                              <span aria-hidden="true" className="flex h-28 w-[168px] items-end rounded-lg bg-[repeating-linear-gradient(135deg,#EEF1EF_0_10px,#F6F8F7_10px_20px)] p-3 text-[20px] font-bold tracking-[-0.02em] text-[#39413D]">{it.name.split('·').pop()?.trim()}</span>
                            )}
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

              {finished && (
                <div className="ap-in flex flex-col gap-4 rounded-xl p-4 md:p-6" style={{ background: gTone.bg }}>
                  <div className="flex flex-wrap gap-x-12 gap-y-4">
                    {G.bigs.map(b => (
                      <div key={b.l}>
                        <div className="text-[32px] md:text-[40px] font-bold leading-[1.1] tracking-[-0.03em] tabular-nums">{b.v}</div>
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
            </div>
          </div>

          <footer className="flex shrink-0 items-center gap-2 border-t border-[var(--color-border)] px-4 py-2 md:justify-between md:px-6 md:py-3">
            <button type="button" onClick={() => prevA && pick(prevA.id)} aria-label={c.prev} className="inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3.5 text-[15px] text-[var(--color-text)] md:px-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="M11 18l-6-6 6-6" /></svg>
              <span className="hidden md:inline">{prevA?.title}</span>
            </button>
            <span className="hidden text-[14px] text-[var(--color-text-muted)] md:inline">{c.of(idx + 1, flat.length)}</span>
            {nextA && <button type="button" onClick={() => pick(nextA.id)} className="h-12 min-w-0 flex-grow cursor-pointer truncate rounded-xl border-0 bg-[#0F1A15] px-4 text-[15px] font-semibold text-white md:flex-grow-0 md:px-6">{c.next(nextA.title)}</button>}
          </footer>
          {/* Телефон: темы внизу, под большим пальцем (как вкладки медиаблока). */}
          <nav aria-label={c.themes} className="grid shrink-0 gap-1 bg-[var(--color-surface-alt)] px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-1 md:hidden" style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}>
            {groups.map((g, i) => {
              const tone = TONES[i % TONES.length], on = g.name === G.group
              return (
                <button key={g.name} type="button" onClick={() => pick(g.items[0].id)} aria-current={on ? 'true' : undefined}
                  className={`flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-0 px-1 text-center text-[12px] leading-tight ${on ? 'bg-white font-semibold shadow-[0_1px_2px_rgb(0_0_0/.06)]' : 'bg-transparent text-[var(--color-text-muted)]'}`}
                  style={{ color: on ? tone.ink : undefined }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: tone.main }} />{g.name}
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}

function ThemeTab({ name, n, tone, on, onClick }: { name: string; n: string; tone: typeof TONES[number]; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={on ? 'true' : undefined}
      className="inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[15px] font-semibold"
      style={on ? { background: tone.ink, borderColor: tone.ink, color: '#fff' } : { background: tone.bg, borderColor: tone.bg, color: tone.ink }}>
      <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : tone.main }} />{name}
      <span className="text-[13px] font-medium tabular-nums opacity-80">{n}</span>
    </button>
  )
}

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#0F1A15] px-3 py-1 text-[13px] font-semibold text-white">
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2l1.8 5.6L19.5 9.5l-5.7 1.9L12 17l-1.8-5.6L4.5 9.5l5.7-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z" /></svg>
      {text}
    </span>
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
