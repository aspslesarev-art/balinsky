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
        // Окно — вариант A «Журнал» (владелец 19.11.2026): белое, текст и
        // воздух, без цветных плашек; тонкая полоса загрузки сверху.
        <div role="dialog" aria-modal="true" aria-label={c.badge} className="fixed inset-0 z-[9999] flex flex-col bg-white">
          <div className="h-0.5 shrink-0 bg-[#F1F3F2]"><div className="h-0.5 bg-[#0F1A15] transition-[width] duration-100 ease-linear" style={{ width: `${progress}%` }} /></div>
          <header className="flex shrink-0 items-center gap-4 py-3 pl-4 pr-2 md:px-12 md:py-5">
            <nav aria-label={c.themes} className="-mb-1 flex min-w-0 flex-grow gap-6 overflow-x-auto pb-1 md:gap-8">
              {groups.map(g => {
                const on = g.name === G.group
                return (
                  <button key={g.name} type="button" onClick={() => pick(g.items[0].id)} aria-current={on ? 'true' : undefined}
                    className={`shrink-0 cursor-pointer whitespace-nowrap border-0 border-b-2 bg-transparent px-0 pb-1 pt-2 text-[15px] transition-colors duration-[120ms] ${on ? 'border-[#0F1A15] font-semibold text-[#0F1A15]' : 'border-transparent text-[#6B7570] hover:text-[#0F1A15]'}`}>
                    {g.name}
                  </button>
                )
              })}
            </nav>
            <button type="button" onClick={close} aria-label={c.close} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#0F1A15] hover:bg-[#F1F3F2] focus-visible:outline-2 focus-visible:outline-offset-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
            </button>
          </header>

          <div className="flex min-h-0 flex-grow flex-col md:flex-row md:gap-16 md:px-12">
            {/* Проверки темы с картинками: на компьютере — столбиком слева, на телефоне — лентой. */}
            <nav aria-label={G.group} className="flex shrink-0 gap-3 overflow-x-auto px-4 pb-3 pt-1.5 md:w-[220px] md:flex-col md:gap-5 md:overflow-y-auto md:px-0 md:pb-6 md:pt-2">
              {groups[gi].items.map(a => {
                const on = a.id === G.id
                const cover = coverOf(a)
                return (
                  <button key={a.id} type="button" data-ap-tab={a.id} onClick={() => pick(a.id)} aria-current={on ? 'true' : undefined}
                    className={`flex w-[132px] shrink-0 cursor-pointer flex-col gap-2 border-0 bg-transparent p-0 text-left transition-opacity duration-[120ms] md:w-full ${on ? '' : 'opacity-70 hover:opacity-100'}`}>
                    <span className="relative block aspect-video w-full overflow-hidden rounded-md bg-[#F1F3F2]" style={on ? { outline: '2px solid #0F1A15', outlineOffset: 3 } : undefined}>
                      {cover && <span className="pointer-events-none absolute inset-0" style={{ filter: locked && !cover.open ? 'blur(6px)' : undefined }}><VizCover v={cover.v} lang={lang} /></span>}
                    </span>
                    <span className={`flex items-center gap-1.5 text-[14px] leading-[1.3] ${on ? 'font-semibold text-[#0F1A15]' : 'text-[#4A5550]'}`}>
                      {busy === a.id ? <span className="ap-spin h-3 w-3 shrink-0 rounded-full border-[1.5px] border-[#0F1A15] border-r-transparent" /> : done[a.id] ? <span aria-label={c.done} className="text-[#1F8B5F]">✓</span> : null}
                      {a.title}
                    </span>
                  </button>
                )
              })}
            </nav>

          <div ref={bodyRef} className="min-h-0 flex-grow overflow-y-auto overscroll-contain">
            <div className="flex max-w-[1000px] flex-col gap-8 px-4 pb-10 pt-2 md:px-0">
              <div className="flex flex-col gap-3">
                <span className="text-[13px] uppercase tracking-[0.06em] text-[#6B7570]" aria-live="polite">
                  {finished ? c.finished : c.working(Math.min(G.sources.length, Math.floor(t / STEP) + 1), G.sources.length)}
                </span>
                <h3 className="m-0 font-display text-[32px] md:text-[44px] font-bold leading-[1.1] tracking-[-0.03em]">{G.title}</h3>
                <p className="m-0 max-w-[56ch] text-[17px] leading-[1.6] text-[#4A5550]">{G.sub}</p>
              </div>

              {/* Готовый источник — маленькая карточка, по 2–3 в ряд (владелец 19.11.2026).
                  На всю ширину — тот, что сейчас идёт, и те, где лента фото или карта. */}
              <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2 xl:grid-cols-3">
              {G.sources.map((s, i) => {
                const lt = t - i * STEP
                if (lt < 0) return null
                const fin = lt >= 24
                const wide = !fin || !!s.live || (s.items?.length ?? 0) > 0
                const scanT = Math.max(0, Math.min(1, (lt - 6) / 14))
                return (
                  <div key={s.name} className={`ap-in grid grid-cols-[16px_minmax(0,1fr)] gap-3 border-t border-[#ECEFED] py-4 ${wide ? 'col-span-full' : ''}`}>
                    <span className={`mt-[7px] h-2 w-2 rounded-full ${fin ? 'bg-[#1F8B5F]' : 'border-[1.5px] border-[#0F1A15]'}`} aria-label={fin ? c.done : undefined} />
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className="text-[15px] font-semibold leading-[1.4]">{s.name} <span className="font-normal text-[#6B7570]">· {s.fresh}</span></span>
                      {!fin && (
                        <span className="text-[15px] text-[#4A5550]">
                          {c.searching} {s.chips.filter((_, k) => lt >= k * 1.5).map((ch, k) => <span key={ch} className="ap-in text-[#0F1A15]">{k > 0 && ' · '}{ch}</span>)}
                        </span>
                      )}
                      {lt >= 6 && lt < 20 && (
                        <span className="flex items-baseline gap-4 text-[16px] text-[#4A5550]">
                          <span className="shrink-0 font-semibold tabular-nums text-[#0F1A15]">{Math.round(s.total * scanT).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')} {plural(s.total * scanT, s.unit)}</span>
                          <span className="truncate text-[#0F1A15]">{s.names[Math.floor(lt) % Math.max(1, s.names.length)]}<span className="ap-blink">▍</span></span>
                        </span>
                      )}
                      {lt >= 20 && lt < 24 && <span className="text-[15px] text-[#4A5550]">{c.filtering}</span>}
                      {!fin && <span className="relative block h-px w-60 overflow-hidden bg-[#ECEFED]"><span className="ap-run absolute inset-y-0 left-0 w-2/5 bg-[#0F1A15]" /></span>}
                      {s.live && lt >= 6 && <div className="ap-in"><VizView v={s.live} lang={lang} /></div>}
                      {s.items && s.items.length > 0 && lt >= 12 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [scroll-snap-type:x_mandatory]">
                          {s.items.map((it, k) => lt >= 12 + k * 2 && (
                            <a key={k} href={locked ? undefined : it.url ?? undefined} target="_blank" rel="noopener noreferrer nofollow" className="ap-chip flex w-[168px] shrink-0 snap-start flex-col gap-1.5 text-[var(--color-text)] no-underline">
                              {it.photo ? (
                                // eslint-disable-next-line @next/next/no-img-element -- внешние фото Booking/Airbnb/rumah123
                                <img src={it.photo} alt={it.name} loading="lazy" className="h-28 w-[168px] rounded-md bg-[#EEF1EF] object-cover" style={{ filter: locked ? 'blur(6px)' : undefined }} />
                              ) : (
                                <span aria-hidden="true" className="flex h-28 w-[168px] items-end rounded-md bg-[#F1F3F2] p-3 text-[20px] font-bold tracking-[-0.02em] text-[#39413D]">{it.name.split('·').pop()?.trim()}</span>
                              )}
                              <span className="line-clamp-2 text-[13px] font-semibold leading-[1.3]">{it.name}</span>
                              <span className="text-[13px] tabular-nums text-[#4A5550]" style={{ filter: locked ? 'blur(4px)' : undefined }}>{it.meta}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {fin && <span className="ap-in text-[16px] leading-[1.6]">{s.result}</span>}
                    </div>
                  </div>
                )
              })}
              </div>

              {finished && (
                <div className="ap-in flex flex-col gap-6 border-t border-[#0F1A15] pt-6">
                  <div className="flex flex-wrap gap-x-16 gap-y-4">
                    {G.bigs.map(b => (
                      <div key={b.l}>
                        <div className="text-[36px] md:text-[44px] font-bold leading-[1.1] tracking-[-0.03em] tabular-nums">{b.v}</div>
                        <div className="text-[15px] text-[#4A5550]">{b.l}</div>
                      </div>
                    ))}
                  </div>
                  {locked ? (
                    <div className="flex flex-wrap items-center gap-6 border-y border-[#ECEFED] py-6">
                      <div className="flex flex-col gap-1.5" style={{ flex: '1 1 260px' }}>
                        <div className="text-[17px] font-semibold">{access === 'pending' ? c.pendingTitle : c.lockTitle(G.vizs.length)}</div>
                        <div className="text-[15px] leading-[1.5] text-[#4A5550]">{access === 'pending' ? c.pendingText : c.lockText}</div>
                      </div>
                      {access === 'guest' && <a href={signInHref} className="flex h-12 items-center rounded-lg bg-[#0F1A15] px-6 text-[15px] font-semibold text-white no-underline hover:bg-[#26312C]">{c.signIn}</a>}
                    </div>
                  ) : (
                    <>
                      {G.vizs.map((v, k) => <VizView key={k} v={v} lang={lang} />)}
                      {extras?.[G.id]}
                    </>
                  )}
                  <p className="m-0 max-w-[64ch] text-[18px] leading-[1.6]"><b className="font-semibold">{c.meaning}</b> {G.meaning}</p>
                  {G.footnote && <div className="text-[13px] text-[#6B7570]">{G.footnote}</div>}
                  <button type="button" onClick={() => pick(G.id, true)} className="self-start cursor-pointer border-0 bg-transparent p-0 text-[15px] text-[#4A5550] underline underline-offset-4 hover:text-[#0F1A15]">{c.again}</button>
                </div>
              )}
            </div>
          </div>
          </div>

          <footer className="flex shrink-0 items-center gap-4 border-t border-[#ECEFED] px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:border-0 md:px-12 md:pb-6 md:pt-4">
            <button type="button" onClick={() => prevA && pick(prevA.id)} aria-label={c.prev} className="flex h-11 min-w-11 shrink-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[15px] text-[#6B7570] hover:text-[#0F1A15]">
              ←<span className="hidden md:inline">{prevA?.title}</span>
            </button>
            <span className="mx-auto" />
            {nextA && <button type="button" onClick={() => pick(nextA.id)} className="flex h-11 min-w-0 shrink cursor-pointer items-center gap-2 truncate border-0 bg-transparent p-0 text-[15px] font-semibold text-[#0F1A15] hover:underline hover:underline-offset-4">{nextA.title} →</button>}
          </footer>
        </div>
      )}
    </div>
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
