'use client'

import { useEffect, useRef } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import type { CollectionItem, PublicAgent } from '@/lib/collections'
import { useCurrency } from '@/components/CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { objectsRu } from './format'

// Страница подборки для клиента. Заход пишется в историю агента
// (/api/p/<token>/visit): устройство и страна — на сервере, здесь только
// метка браузера, «ещё смотрит» раз в 30 секунд и какой объект открыл.

const PING_MS = 30_000
const PING_MAX = 60 // полчаса, дальше не считаем

function visitorId(): string {
  try {
    const k = 'bx_pv'
    let v = localStorage.getItem(k)
    if (!v || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) {
      v = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 20)
      localStorage.setItem(k, v)
    }
    return v
  } catch {
    return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  }
}

const key = (i: { kind: string; slug: string }) => `${i.kind}:${i.slug}`
const href = (i: { kind: string; slug: string }) => `/ru/${i.kind === 'villa' ? 'villy' : 'apartamenty'}/o/${i.slug}`

export function ClientCollection({ token, title, intro, items, agent, track }: {
  token: string; title: string; intro: string | null; items: CollectionItem[]; agent: PublicAgent; track: boolean
}) {
  const { currency } = useCurrency()
  const visit = useRef<number | null>(null)
  const api = `/api/p/${token}/visit`

  useEffect(() => {
    if (!track) return
    let pings = 0
    let timer: ReturnType<typeof setInterval> | null = null
    fetch(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ visitor: visitorId() }) })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { id?: number } | null) => {
        if (!d?.id) return
        visit.current = d.id
        timer = setInterval(() => {
          if (document.visibilityState !== 'visible' || ++pings > PING_MAX) return
          fetch(api, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: d.id }), keepalive: true }).catch(() => {})
        }, PING_MS)
      })
      .catch(() => {})
    return () => { if (timer) clearInterval(timer) }
  }, [api, track])

  function opened(it: CollectionItem) {
    if (visit.current == null) return
    fetch(api, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: visit.current, viewed: key(it) }), keepalive: true }).catch(() => {})
  }

  const tg = agent.username ? `https://t.me/${agent.username}` : null
  const digits = agent.phone?.replace(/\D/g, '') ?? ''
  const wa = digits.length >= 8 ? `https://wa.me/${digits}` : null
  const initials = agent.name.replace(/^@/, '').split(/\s+/).map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase()
  const main = tg ?? wa

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-surface-alt)] pb-24 md:pb-0">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex w-full max-w-[1184px] items-center gap-3 px-4 py-3 sm:px-6 md:py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[15px] font-semibold text-[var(--color-primary-pressed)] md:h-12 md:w-12 md:text-[18px]" aria-hidden>{initials}</span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold md:text-[16px]">{agent.name}</span>
            <span className="truncate text-[13px] text-[var(--color-text-muted)] md:text-[14px]">{agent.agency ? `${agent.agency} · ` : ''}ваш агент на Бали</span>
          </div>
          <div className="ml-auto hidden gap-2 md:flex">
            {wa && <a href={wa} target="_blank" rel="noopener" className="flex h-11 items-center rounded-xl border border-[var(--color-border)] px-4 text-[15px] font-medium text-[var(--color-text)] no-underline hover:bg-[var(--color-surface-alt)]">WhatsApp</a>}
            {tg && <a href={tg} target="_blank" rel="noopener" className="flex h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 text-[15px] font-semibold text-white no-underline hover:bg-[var(--color-primary-hover)]">Написать в Telegram</a>}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-[1184px] flex-col gap-6 px-4 py-6 sm:px-6 md:gap-8 md:py-12">
        <div className="flex max-w-[68ch] flex-col gap-2 md:gap-3">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">Подборка · {objectsRu(items.length)}</span>
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-tight md:text-[44px]">{title}</h1>
          {intro && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--color-text-muted)] md:text-[17px]">{intro}</p>}
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-[15px] text-[var(--color-text-muted)]">Агент ещё собирает объекты - загляните чуть позже.</p>
        ) : (
          <ol className="grid gap-4 md:grid-cols-2 md:gap-6">
            {items.map((it, i) => {
              const s = it.snapshot
              const meta = [it.kind === 'villa' ? 'Вилла' : 'Апартаменты', s.district, s.bedrooms ? `${s.bedrooms} ${s.bedrooms === 1 ? 'спальня' : s.bedrooms < 5 ? 'спальни' : 'спален'}` : null, s.area ? `${s.area} м²` : null].filter(Boolean).join(' · ')
              const chips = [s.leaseYears ? `Лизхолд ${s.leaseYears} лет` : null, s.status].filter((x): x is string => !!x)
              return (
                <li key={key(it)} className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
                  <a href={href(it)} onClick={() => opened(it)} className="relative block" aria-label={`${s.title} - подробнее`}>
                    {s.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- фото из снимка объекта
                      <img src={s.photo} alt={s.title} loading={i < 2 ? 'eager' : 'lazy'} className="block h-[220px] w-full object-cover md:h-[300px]" />
                    ) : <span className="block h-[220px] w-full bg-[var(--color-search-bg)] md:h-[300px]" />}
                    <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[var(--color-text)]">{i + 1}</span>
                  </a>
                  <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-[18px] font-semibold leading-snug md:text-[20px]">{s.title}</h2>
                      {s.priceUsd != null && <span className="ml-auto shrink-0 text-[18px] font-semibold md:text-[20px]">{formatPrice(s.priceUsd, currency, 'ru')}</span>}
                    </div>
                    {meta && <p className="text-[14px] text-[var(--color-text-muted)] md:text-[15px]">{meta}</p>}
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {chips.map(c => <span key={c} className="rounded-lg bg-[var(--color-surface-alt)] px-2.5 py-1 text-[13px] font-medium">{c}</span>)}
                      </div>
                    )}
                    {it.note && (
                      <div className="flex items-start gap-3 rounded-lg bg-[var(--color-primary-soft)] p-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[var(--color-primary-pressed)]" aria-hidden>{initials}</span>
                        <p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--color-primary-pressed)]"><span className="sr-only">Заметка агента: </span>{it.note}</p>
                      </div>
                    )}
                    <div className="mt-auto flex gap-2 pt-2">
                      <a href={href(it)} onClick={() => opened(it)}
                        className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[15px] font-semibold text-[var(--color-primary-pressed)] no-underline hover:bg-[#d3e8dc]">Подробнее об объекте</a>
                      {main && (
                        <a href={main} target="_blank" rel="noopener"
                          className="hidden h-11 items-center rounded-xl border border-[var(--color-border)] px-4 text-[15px] font-medium text-[var(--color-text)] no-underline hover:bg-[var(--color-surface-alt)] md:flex">Спросить агента</a>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {main && (
          <section className="hidden items-center gap-6 rounded-xl bg-[var(--color-text)] p-8 text-white md:flex">
            <div className="flex flex-col gap-2">
              <h2 className="text-[24px] font-semibold tracking-tight">Понравилось что-то?</h2>
              <p className="text-[15px] leading-relaxed text-[#C9D1CD]">Напишите номер объекта - агент организует онлайн-показ или встречу на месте.</p>
            </div>
            <a href={main} target="_blank" rel="noopener" className="ml-auto flex h-[52px] shrink-0 items-center rounded-xl bg-[var(--color-primary)] px-6 text-[16px] font-semibold text-white no-underline hover:bg-[var(--color-primary-hover)]">Написать агенту</a>
          </section>
        )}
        <p className="text-center text-[13px] text-[var(--color-text-muted)]">Данные по объектам - balinsky.info, аналитика недвижимости Бали</p>
      </main>

      {main && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-[var(--color-border)] bg-white px-4 pb-6 pt-3 md:hidden">
          <a href={main} target="_blank" rel="noopener" className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-[16px] font-semibold text-white no-underline">
            <MessageCircle size={18} aria-hidden /> Написать агенту
          </a>
          {tg && wa && (
            <a href={wa} target="_blank" rel="noopener" aria-label="WhatsApp" className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text)]">
              <Phone size={20} aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
